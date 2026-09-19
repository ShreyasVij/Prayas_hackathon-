export function generateDoctorCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) result += "-";
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function normalizeDoctorCode(code: string): string {
  if (!code) return "";
  return code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function validateDoctorCode(code: string): boolean {
  if (!code) return false;
  const normalized = normalizeDoctorCode(code);
  return normalized.length === 16;
}
