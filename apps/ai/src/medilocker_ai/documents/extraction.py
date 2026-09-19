from __future__ import annotations

import json
import re
from datetime import datetime
from typing import Any

from ..core.config import get_settings
from ..core.safety import clean_string_list, clean_text, normalize_token, parse_json_value
from ..runtime.client import RuntimeClient


def _prompt_template() -> str:
    return (get_settings().prompt_dir / "extraction" / "extraction.txt").read_text(encoding="utf-8")


def _fill(template: str, **values: str) -> str:
    for key, value in values.items():
        template = template.replace("{{" + key + "}}", value)
    return template


def _normalize_date(value: Any) -> str | None:
    raw = clean_text(value)
    if not raw:
        return None
    for fmt in (
        "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%m-%d-%Y",
        "%d %b %Y", "%d %B %Y", "%b %d %Y", "%B %d %Y",
    ):
        try:
            return datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    match = re.search(r"(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", raw)
    if match:
        value = match.group(1)
        for fmt in ("%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%m-%d-%Y"):
            try:
                return datetime.strptime(value, fmt).strftime("%Y-%m-%d")
            except ValueError:
                pass
        return value
    return raw


def _first_match(text: str, patterns: tuple[str, ...]) -> str | None:
    for pattern in patterns:
        match = re.search(pattern, text, re.I | re.M)
        if match:
            value = clean_text(match.group(1)).strip(" .;")
            if value:
                return value
    return None


def _deterministic_metadata(text: str) -> dict[str, Any]:
    return {
        "patient_name": _first_match(text, (r"(?:Patient(?:\s+Name)?|Patient's\s+Name|Name)\s*[:\-]\s*(.+)$",)),
        "doctor_name": _first_match(text, (
            r"(?:Doctor(?:\s+Name)?|Physician(?:\s+Name)?|Referring\s+Physician|Consultant|Provider)\s*[:\-]\s*(.+)$",
            r"\b(Dr\.?\s+[A-Z][A-Za-z.]+(?:\s+[A-Z][A-Za-z.]+){0,3})\b",
        )),
        "diagnosis": _first_match(text, (r"(?:Diagnosis|Impression|Assessment|Clinical\s+Impression)\s*[:\-]\s*(.+)$",)),
        "dob": _normalize_date(_first_match(text, (r"(?:Date\s+of\s+Birth|DOB|D\.O\.B\.)\s*[:\-]\s*(.+)$",))),
        "report_date": _normalize_date(_first_match(text, (
            r"(?:Report\s+Date|Date\s+of\s+Report|Date\s+of\s+Test|Test\s+Date)\s*[:\-]\s*(.+)$",
            r"^Date\s*[:\-]\s*(.+)$",
        ))),
    }


def _parse_number(value: str) -> int | float | str:
    value = value.replace(",", ".").strip()
    try:
        number = float(value)
        return int(number) if number.is_integer() else number
    except ValueError:
        return value


def _parse_lab_vitals(text: str) -> list[dict[str, Any]]:
    analytes: list[tuple[str, str]] = [
        ("Total Cholesterol", r"\btotal\s+cholesterol\b"),
        ("HDL Cholesterol", r"\bhdl(?:\s+cholesterol)?\b"),
        ("LDL Cholesterol", r"\bldl(?:\s+cholesterol)?\b"),
        ("Triglycerides", r"\btriglycerides?\b"),
        ("ALT (SGPT)", r"\balt\s*\(\s*sgpt\s*\)|\bsgpt\b"),
        ("AST (SGOT)", r"\bast\s*\(\s*sgot\s*\)|\bsgot\b"),
        ("Alkaline Phosphatase", r"\balkaline\s+phosphatase\b"),
        ("Total Bilirubin", r"\btotal\s+bilirubin\b|\bbilirubin\b"),
        ("Hemoglobin (Hb)", r"\bhemoglobin\b|\bhb\b"),
        ("Red Blood Cells (RBC)", r"\bred\s+blood\s+cells\b|\brbc\b"),
        ("White Blood Cells (WBC)", r"\bwhite\s+blood\s+cells\b|\bwbc\b"),
        ("Platelet Count", r"\bplatelet(?:\s+count)?\b|\bthrombocytes\b"),
        ("Creatinine", r"\bcreatinine\b"),
        ("Blood Urea Nitrogen (BUN)", r"\bblood\s+urea\s+nitrogen\b|\bbun\b"),
        ("Sodium", r"\bsodium\b"),
        ("Potassium", r"\bpotassium\b"),
        ("Glucose", r"\bglucose\b|\bblood\s+sugar\b"),
        ("Protein", r"\bprotein\b"),
        ("Ketones", r"\bketones?\b"),
    ]
    units = ("mg/dL", "mg/L", "g/dL", "U/L", "mmol/L", "thousand/μL", "million/μL", "lakh/μL", "thousand/uL", "million/uL", "μL", "uL", "/μL", "/uL", "mmHg", "%")
    lines = text.splitlines()
    results: list[dict[str, Any]] = []
    seen: set[str] = set()
    for label, pattern in analytes:
        matcher = re.compile(pattern, re.I)
        for index, line in enumerate(lines):
            if not matcher.search(line):
                continue
            for candidate in lines[index : min(index + 5, len(lines))]:
                normalized = candidate.strip()
                lower = normalized.lower()
                if not normalized or any(token in lower for token in ("reference range", "ref range", "reference values", "flag:")):
                    continue
                match = re.search(r"(?<![A-Za-z])([0-9]+(?:[.,][0-9]+)?)", normalized)
                if match:
                    unit = next((unit for unit in units if unit.lower() in lower), None)
                    key = normalize_token(label)
                    if key not in seen:
                        results.append({"label": label, "value": _parse_number(match.group(1)), "unit": unit})
                        seen.add(key)
                    break
                qualitative = re.search(r"\b(negative|positive|normal|high|low|abnormal|trace)\b", normalized, re.I)
                if qualitative and label in {"Protein", "Ketones"}:
                    key = normalize_token(label)
                    if key not in seen:
                        results.append({"label": label, "value": qualitative.group(1).capitalize(), "unit": None})
                        seen.add(key)
                    break
            break
    return results


def _normalize_medications(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    result: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in value:
        if isinstance(item, str):
            name, dose, frequency = clean_text(item), None, None
        elif isinstance(item, dict):
            name = clean_text(item.get("name") or item.get("medication") or item.get("drug") or item.get("medicine"))
            dose = clean_text(item.get("dose") or item.get("strength")) or None
            frequency = clean_text(item.get("frequency") or item.get("schedule") or item.get("timing")) or None
        else:
            continue
        if not name:
            continue
        key = normalize_token(name)
        if key in seen:
            continue
        seen.add(key)
        result.append({"name": name, "dose": dose, "frequency": frequency})
    return result


def _normalize_vitals(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    result: list[dict[str, Any]] = []
    for item in value:
        if not isinstance(item, dict):
            continue
        label = clean_text(item.get("label") or item.get("name") or item.get("test") or item.get("analyte"))
        if not label or "value" not in item:
            continue
        result.append({"label": label, "value": item.get("value"), "unit": clean_text(item.get("unit")) or None})
    return result


def _canonical_classification(value: Any, text: str) -> str:
    token = normalize_token(value)
    if token in {"lab", "lab report", "laboratory", "laboratory report", "test report", "test result", "lab result"}:
        return "Lab Report"
    if token in {"prescription", "rx", "medication list", "medications"}:
        return "Prescription"
    if token in {"discharge", "discharge summary", "discharge report"}:
        return "Discharge Summary"
    return _classification_from_text(text)


def _classification_from_text(text: str) -> str:
    low = " ".join(text.lower().split())
    if any(k in low for k in ("lab", "report", "result", "value", "reference range")):
        return "Lab Report"
    if any(k in low for k in ("rx", "prescription", "take", "dosage")):
        return "Prescription"
    if any(k in low for k in ("discharge", "admit", "hospital", "ward")):
        return "Discharge Summary"
    if any(k in low for k in ("scan", "mri", "ct", "x-ray", "imaging")):
        return "Other"
    return "Other"


def _value_aliases(parsed: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in parsed and parsed[key] not in (None, ""):
            return parsed[key]
    return None


def _looks_supported(value: Any, source: str) -> bool:
    text = clean_text(value)
    if not text:
        return False
    lower_source = source.lower()
    compact = text.lower()
    if compact in lower_source:
        return True
    tokens = [token for token in re.split(r"[^a-z0-9]+", compact) if len(token) >= 3]
    return bool(tokens) and all(token in lower_source for token in tokens)


def _recover_json_fields(raw: str) -> dict[str, Any]:
    """Recover common fields from a truncated/plain model response."""
    recovered: dict[str, Any] = {}
    patterns: dict[str, tuple[str, ...]] = {
        "patient_name": (r'"patient_name"\s*:\s*"([^"]+)"', r'patient_name\s*[:=]\s*([^\n,}]+)'),
        "dob": (r'"(?:dob|date_of_birth)"\s*:\s*"([^"]+)"', r'(?:dob|date_of_birth)\s*[:=]\s*([^\n,}]+)'),
        "doctor_name": (r'"(?:doctor_name|doctorName)"\s*:\s*"([^"]+)"', r'(?:doctor_name|doctorName)\s*[:=]\s*([^\n,}]+)'),
        "diagnosis": (r'"diagnosis"\s*:\s*"([^"]+)"', r'diagnosis\s*[:=]\s*([^\n,}]+)'),
        "report_date": (r'"(?:report_date|reportDate)"\s*:\s*"([^"]+)"', r'(?:report_date|reportDate)\s*[:=]\s*([^\n,}]+)'),
        "summary": (r'"(?:summary|in_depth_summary|summary_text|explanation)"\s*:\s*"([^"]+)"',),
        "classification": (r'"classification"\s*:\s*"([^"]+)"', r'classification\s*[:=]\s*([^\n,}]+)'),
    }
    for field, variants in patterns.items():
        for pattern in variants:
            match = re.search(pattern, raw, re.I)
            if match:
                recovered[field] = clean_text(match.group(1)).strip('"')
                break
    return recovered


class ExtractionService:
    def __init__(self, runtime: RuntimeClient | None = None) -> None:
        self.runtime = runtime or RuntimeClient()

    async def extract(self, ocr_text: str) -> dict[str, Any]:
        original = ocr_text or ""
        text = original.strip()
        if not text:
            return {
                "patient_name": None, "dob": None, "doctor_name": None, "diagnosis": None,
                "report_date": None, "medications": [], "vitals": [], "summary": None,
                "classification": "Other", "raw_text": original, "panel": None,
            }

        settings = get_settings()
        prompt = _fill(_prompt_template(), OCR_TEXT=text[: settings.max_ocr_chars])
        parsed: dict[str, Any] = {}
        try:
            response = await self.runtime.generate_text(
                prompt,
                system_instruction="You convert OCR medical text into conservative structured data. Return source-supported facts only.",
                temperature=0.1,
                max_output_tokens=1200,
            )
            try:
                value = parse_json_value(response.text)
                if isinstance(value, dict):
                    parsed = value
            except Exception:
                parsed = _recover_json_fields(response.text)
        except Exception:
            parsed = {}

        deterministic = _deterministic_metadata(text)
        patient_name = _value_aliases(parsed, "patient_name", "patientName", "name") or deterministic["patient_name"]
        if patient_name and not _looks_supported(patient_name, text):
            patient_name = deterministic["patient_name"] if deterministic["patient_name"] and _looks_supported(deterministic["patient_name"], text) else None

        dob = _normalize_date(_value_aliases(parsed, "dob", "date_of_birth", "dateOfBirth") or deterministic["dob"])
        doctor_name = _value_aliases(parsed, "doctor_name", "doctorName", "doctor", "doctorFullName", "physician", "physician_name", "referring_physician", "provider") or deterministic["doctor_name"]
        if doctor_name and not _looks_supported(doctor_name, text):
            doctor_name = deterministic["doctor_name"] if deterministic["doctor_name"] and _looks_supported(deterministic["doctor_name"], text) else None

        diagnosis = _value_aliases(parsed, "diagnosis", "impression", "interpretation", "assessment") or deterministic["diagnosis"]
        if diagnosis and not _looks_supported(diagnosis, text):
            diagnosis = deterministic["diagnosis"] if deterministic["diagnosis"] and _looks_supported(deterministic["diagnosis"], text) else None

        report_date = _normalize_date(_value_aliases(parsed, "report_date", "reportDate", "date_of_report", "dateOfReport", "date") or deterministic["report_date"])

        medications = _normalize_medications(_value_aliases(parsed, "medications", "meds", "medicines", "prescriptions"))
        vitals = _normalize_vitals(_value_aliases(parsed, "vitals", "observations", "lab_results", "labResults"))
        if not vitals:
            vitals = _parse_lab_vitals(text)

        summary = clean_text(_value_aliases(parsed, "summary", "in_depth_summary", "summary_text", "explanation")) or None
        classification = _canonical_classification(_value_aliases(parsed, "classification", "document_type", "documentType", "doc_type"), text)
        panel = clean_text(_value_aliases(parsed, "panel", "test_panel", "panel_name")) or None

        return {
            "patient_name": patient_name,
            "dob": dob,
            "doctor_name": doctor_name,
            "diagnosis": diagnosis,
            "report_date": report_date,
            "medications": medications,
            "vitals": vitals,
            "summary": summary,
            "classification": classification,
            "raw_text": original,
            "panel": panel,
        }
