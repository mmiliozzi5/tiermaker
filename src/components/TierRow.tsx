"use client";

import { TIER_COLORS } from "@/lib/scoring";
import { ItemCard } from "./ItemCard";
import type { ItemWithAvg } from "@/types";

interface Props {
  tier: string;
  items: ItemWithAvg[];
  showAvg?: boolean;
}

export function TierRow({ tier, items, showAvg }: Props) {
  const color = TIER_COLORS[tier] ?? "#6b7280";

  return (
    <div className="flex min-h-[90px] rounded-lg overflow-hidden">
      {/* Etiqueta del tier */}
      <div
        className="w-14 flex-shrink-0 flex items-center justify-center font-bold text-xl text-gray-900"
        style={{ backgroundColor: color }}
      >
        {tier}
      </div>

      {/* Ítems */}
      <div className="flex-1 bg-gray-900 border border-gray-800 border-l-0 flex flex-wrap gap-3 p-3 items-start content-start min-h-[90px]">
        {items.length === 0 ? (
          <span className="text-gray-500 text-sm self-center">— vacío —</span>
        ) : (
          items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              avg={item.avg}
              showAvg={showAvg}
            />
          ))
        )}
      </div>
    </div>
  );
}
