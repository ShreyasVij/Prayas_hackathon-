from typing import Dict, Any, Optional, List

# The 12-disease lookup table
DISEASE_REGISTRY: Dict[str, Dict[str, Any]] = {
    "pneumonia": {
        "model_id": "lxyuan/vit-xray-pneumonia-classification",
        "display_name": "Pneumonia Detection",
        "modality": "Chest X-Ray",
    },
    "covid19": {
        "model_id": "dima806/covid-19-chest-xray-classification",
        "display_name": "COVID-19 Detection",
        "modality": "Chest X-Ray",
    },
    "tuberculosis": {
        "model_id": "dima806/tuberculosis-classification-chest-xray",
        "display_name": "Tuberculosis Screening",
        "modality": "Chest X-Ray",
    },
    "lung_cancer": {
        "model_id": "dima806/lung_cancer_image_classification",
        "display_name": "Lung Cancer Screening",
        "modality": "Chest CT Scan",
    },
    "melanoma": {
        "model_id": "Anwarkh1/Skin_Cancer-Image_Classification",
        "display_name": "Melanoma & Skin Lesion Analysis",
        "modality": "Dermatoscopy",
    },
    "diabetic_retinopathy": {
        "model_id": "Ahmed-Selem/Shifaa-Diabetic-Retinopathy-EfficientNetB0",
        "display_name": "Diabetic Retinopathy Severity Grading",
        "modality": "Retinal Fundus Scan",
    },
    "glaucoma": {
        "model_id": "dima806/glaucoma-classification-from-fundus-images",
        "display_name": "Glaucoma Screening",
        "modality": "Retinal Fundus Scan",
    },
    "brain_tumor": {
        "model_id": "dima806/brain_tumor_image_classification",
        "display_name": "Brain Tumor Classification",
        "modality": "Brain MRI",
    },
    "alzheimers": {
        "model_id": "Fhaiza/Alzheimer_MRI_Classification",
        "display_name": "Alzheimer's Stage Assessment",
        "modality": "Brain MRI",
    },
    "breast_cancer": {
        "model_id": "dima806/breast_cancer_image_classification",
        "display_name": "Breast Cancer Histopathology",
        "modality": "Tissue Biopsy Slide (WSI)",
    },
    "leukemia": {
        "model_id": "dima806/leukemia_classification_blood_smears",
        "display_name": "Leukemia Blood Smear Analysis",
        "modality": "Blood Smear",
    },
    "arrhythmia": {
        "model_id": "adzetto/ecg-arrhythmia-classifier",
        "display_name": "ECG Arrhythmia Screening",
        "modality": "ECG Waveform Image",
    }
}


def get_disease_info(disease_id: str) -> Optional[Dict[str, Any]]:
    """Lookup metadata for a specific disease ID."""
    return DISEASE_REGISTRY.get(disease_id.lower())


def list_supported_diseases() -> List[Dict[str, str]]:
    """Return array of all 12 diseases for dropdown selection in the frontend."""
    return [
        {
            "id": key,
            "display_name": val["display_name"],
            "modality": val["modality"]
        }
        for key, val in DISEASE_REGISTRY.items()
    ]