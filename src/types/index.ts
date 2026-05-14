export type TierFormat = "letters" | "numbers";
export type RankingMethod = "score" | "position";
export type TierlistStatus = "open" | "finished";
export type ParticipantStatus = "ranking" | "confirmed";

export interface Tierlist {
  id: string;
  name: string;
  code: string;
  host_name: string;
  tier_format: TierFormat;
  ranking_method: RankingMethod;
  status: TierlistStatus;
  created_at: string;
}

export interface Item {
  id: string;
  tierlist_id: string;
  name: string;
  image_url: string | null;
  display_order: number;
  created_at: string;
}

export interface Participant {
  id: string;
  tierlist_id: string;
  name: string;
  status: ParticipantStatus;
  created_at: string;
}

export interface Ranking {
  id: string;
  participant_id: string;
  item_id: string;
  score: number | null;
  position: number | null;
}

export interface ItemWithAvg extends Item {
  avg: number;
  tier: string;
}
