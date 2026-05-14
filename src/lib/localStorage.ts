const NAME_KEY = "tiermaker_name";
const CODE_KEY = "tiermaker_code";

export function getStoredName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(NAME_KEY) ?? "";
}

export function setStoredName(name: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NAME_KEY, name);
}

export function getStoredCode(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(CODE_KEY) ?? "";
}

export function setStoredCode(code: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CODE_KEY, code);
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(NAME_KEY);
  localStorage.removeItem(CODE_KEY);
}
