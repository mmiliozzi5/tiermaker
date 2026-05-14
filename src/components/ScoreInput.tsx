"use client";

import Image from "next/image";
import type { Item } from "@/types";

interface Props {
  items: Item[];
  values: Record<string, string>;
  onChange: (itemId: string, value: string) => void;
}

export function ScoreInput({ items, values, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-3 bg-gray-900 rounded-xl p-3 border border-gray-800"
        >
          {/* Imagen */}
          <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0 flex items-center justify-center">
            {item.image_url ? (
              <Image
                src={item.image_url}
                alt={item.name}
                width={56}
                height={56}
                className="object-cover w-full h-full"
              />
            ) : (
              <span className="text-2xl">🎯</span>
            )}
          </div>

          {/* Nombre */}
          <span className="flex-1 text-white font-medium text-sm">{item.name}</span>

          {/* Input */}
          <input
            type="text"
            inputMode="decimal"
            placeholder="0-10"
            value={values[item.id] ?? ""}
            onChange={(e) => onChange(item.id, e.target.value.replace(",", "."))}
            className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-white text-center text-sm focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
          />
        </div>
      ))}
    </div>
  );
}
