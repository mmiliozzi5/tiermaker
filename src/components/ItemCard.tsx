"use client";

import Image from "next/image";
import type { Item } from "@/types";

interface Props {
  item: Item;
  avg?: number;
  showAvg?: boolean;
  size?: "sm" | "md";
}

export function ItemCard({ item, avg, showAvg, size = "md" }: Props) {
  const dim = size === "sm" ? "w-16 h-16" : "w-20 h-20";

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <div
        className={`${dim} rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center flex-shrink-0`}
      >
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name}
            width={size === "sm" ? 64 : 80}
            height={size === "sm" ? 64 : 80}
            className="object-cover w-full h-full"
          />
        ) : (
          <span className="text-2xl">🎯</span>
        )}
      </div>
      <span className="text-xs text-center text-gray-200 max-w-[80px] leading-tight line-clamp-2">
        {item.name}
      </span>
      {showAvg && avg !== undefined && (
        <span className="text-xs text-gray-400">{avg.toFixed(1)}</span>
      )}
    </div>
  );
}
