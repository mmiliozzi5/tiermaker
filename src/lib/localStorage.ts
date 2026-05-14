const NAME_KEY = "tiermaker_name";
const CODE_KEY = "tiermaker_code";
const HISTORY_KEY = "tiermaker_history";

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

export interface HistoryEntry {
  code: string;
  name: string;
  joined_at: string;
}

export function getTierlistHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function addToTierlistHistory(entry: HistoryEntry): void {
  if (typeof window === "undefined") return;
  const history = getTierlistHistory().filter((e) => e.code !== entry.code);
  localStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...history].slice(0, 15)));
}

export function removeFromTierlistHistory(code: string): void {
  if (typeof window === "undefined") return;
  const history = getTierlistHistory().filter((e) => e.code !== code);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}
