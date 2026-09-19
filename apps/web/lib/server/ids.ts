import { randomUUID } from "crypto";

export class ObjectId {
  private readonly value: string;

  constructor(value?: string | { toString(): string }) {
    if (value && typeof value === "object") this.value = String(value.toString());
    else this.value = String(value || randomUUID());
  }

  toString() {
    return this.value;
  }

  toHexString() {
    return this.value;
  }

  valueOf() {
    return this.value;
  }

  equals(other: any) {
    return normalizeId(this) === normalizeId(other);
  }

  static isValid(value: any) {
    return value !== undefined && value !== null && String(value).length > 0;
  }
}

export function normalizeId(value: any): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "object" && typeof value.toHexString === "function") return String(value.toHexString());
  if (typeof value === "object" && typeof value.toString === "function") return String(value.toString());
  return String(value);
}
