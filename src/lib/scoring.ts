import type { TierFormat } from "@/types";

export function positionToScore(position: number, total: number): number {
  if (total === 1) return 10;
  return 10 * (total - 1 - position) / (total - 1);
}

export function scoreToTier(avg: number, format: TierFormat): string {
  const band =
    avg >= 8 ? 0 : avg >= 6 ? 1 : avg >= 4 ? 2 : avg >= 2 ? 3 : 4;
  return format === "letters"
    ? ["S", "A", "B", "C", "D"][band]
    : ["1", "2", "3", "4", "5"][band];
}

export const TIER_LABELS: Record<TierFormat, string[]> = {
  letters: ["S", "A", "B", "C", "D"],
  numbers: ["1", "2", "3", "4", "5"],
};

export const TIER_COLORS: Record<string, string> = {
  S: "#FFD700",
  "1": "#FFD700",
  A: "#FF8C00",
  "2": "#FF8C00",
  B: "#32CD32",
  "3": "#32CD32",
  C: "#4169E1",
  "4": "#4169E1",
  D: "#DC143C",
  "5": "#DC143C",
};
