"use client";

import Image from "next/image";
import type { ItemWithAvg } from "@/types";

interface Props {
  top3: ItemWithAvg[];
}

const MEDALS = [
  { emoji: "🥇", label: "1er lugar", bg: "#FFD700", text: "#78350f", height: "h-28" },
  { emoji: "🥈", label: "2do lugar", bg: "#C0C0C0", text: "#1f2937", height: "h-20" },
  { emoji: "🥉", label: "3er lugar", bg: "#CD7F32", text: "#1f2937", height: "h-16" },
];

export function Podium({ top3 }: Props) {
  if (top3.length === 0) return null;

  const order = [top3[1], top3[0], top3[2]].filter(Boolean);
  const medalOrder = top3[1] ? [MEDALS[1], MEDALS[0], MEDALS[2]] : [MEDALS[0], MEDALS[2]];

  return (
    <div className="mt-8">
      <h2 className="text-center text-2xl font-bold text-white mb-6">Podio</h2>

      {/* Mobile: vertical list */}
      <div className="flex flex-col gap-4 sm:hidden">
        {top3.slice(0, 3).map((item, idx) => {
          const medal = MEDALS[idx];
          return (
            <div
              key={item.id}
              className="flex items-center gap-4 rounded-xl p-4"
              style={{ backgroundColor: medal.bg + "22", border: `2px solid ${medal.bg}` }}
            >
              <span className="text-4xl">{medal.emoji}</span>
              <div
                className="w-14 h-14 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0 flex items-center justify-center"
              >
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
              <div>
                <p className="font-bold text-white text-lg">{item.name}</p>
                <p className="text-gray-400 text-sm">{item.avg.toFixed(2)} pts</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: podium columns */}
      <div className="hidden sm:flex items-end justify-center gap-4">
        {order.map((item, idx) => {
          const medal = medalOrder[idx];
          if (!item || !medal) return null;
          return (
            <div key={item.id} className="flex flex-col items-center gap-2 w-36">
              {/* Card */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-4xl">{medal.emoji}</span>
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-700 flex items-center justify-center">
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      width={80}
                      height={80}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <span className="text-3xl">🎯</span>
                  )}
                </div>
                <p className="font-bold text-white text-center text-sm">{item.name}</p>
                <p className="text-gray-400 text-xs">{item.avg.toFixed(2)} pts</p>
              </div>
              {/* Base */}
              <div
                className={`w-full ${medal.height} rounded-t-lg flex items-start justify-center pt-2 font-bold text-lg`}
                style={{ backgroundColor: medal.bg, color: medal.text }}
              >
                {medal.emoji}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
