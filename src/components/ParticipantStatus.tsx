"use client";

import type { Participant } from "@/types";

interface Props {
  participants: Participant[];
}

export function ParticipantStatus({ participants }: Props) {
  const confirmed = participants.filter((p) => p.status === "confirmed").length;
  const total = participants.length;

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-white">Participantes</h3>
        <span className="text-sm text-gray-400">
          {confirmed}/{total} confirmaron
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
        <div
          className="bg-green-500 h-2 rounded-full transition-all duration-500"
          style={{ width: total > 0 ? `${(confirmed / total) * 100}%` : "0%" }}
        />
      </div>

      <ul className="flex flex-col gap-2">
        {participants.map((p) => (
          <li key={p.id} className="flex items-center justify-between">
            <span className="text-gray-300 text-sm">{p.name}</span>
            {p.status === "confirmed" ? (
              <span className="flex items-center gap-1 text-xs bg-green-900/50 text-green-400 border border-green-700 rounded-full px-2 py-0.5">
                ✓ Confirmado
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs bg-yellow-900/50 text-yellow-400 border border-yellow-700 rounded-full px-2 py-0.5">
                ⏳ Rankeando
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
