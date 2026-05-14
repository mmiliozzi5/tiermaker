"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Participant, TierlistStatus } from "@/types";

export function useRealtimeParticipants(
  tierId: string,
  initialParticipants: Participant[],
  initialStatus: TierlistStatus
) {
  const [participants, setParticipants] =
    useState<Participant[]>(initialParticipants);
  const [tierlistStatus, setTierlistStatus] =
    useState<TierlistStatus>(initialStatus);
  const [tierlistDeleted, setTierlistDeleted] = useState(false);

  // Sincronizar cuando loadData termina y actualiza initialParticipants
  useEffect(() => {
    if (initialParticipants.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setParticipants(initialParticipants);
    }
  }, [initialParticipants]);

  useEffect(() => {
    if (!tierId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`tierlist-${tierId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants",
          filter: `tierlist_id=eq.${tierId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setParticipants((prev) => [...prev, payload.new as Participant]);
          } else if (payload.eventType === "UPDATE") {
            setParticipants((prev) =>
              prev.map((p) =>
                p.id === payload.new.id ? (payload.new as Participant) : p
              )
            );
          } else if (payload.eventType === "DELETE") {
            setParticipants((prev) =>
              prev.filter((p) => p.id !== payload.old.id)
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tierlists",
          filter: `id=eq.${tierId}`,
        },
        (payload) => {
          if (payload.new.status) {
            setTierlistStatus(payload.new.status as TierlistStatus);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "tierlists",
        },
        (payload) => {
          if (payload.old?.id === tierId) {
            setTierlistDeleted(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tierId]);

  return { participants, tierlistStatus, tierlistDeleted };
}
