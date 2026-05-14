# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Important:** This project uses Next.js 16 and React 19. APIs, conventions, and file structure differ significantly from older versions. Read `node_modules/next/dist/docs/` before writing code if unsure about a specific API.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint check
npx tsc --noEmit # TypeScript check (no test suite exists)
```

Always run both `tsc --noEmit` and `npm run lint` before committing.

## Architecture

**Stack:** Next.js 16 App Router · React 19 · Supabase (PostgreSQL + Storage + Realtime) · Tailwind CSS v4 · @dnd-kit

**No authentication.** Identity is name-only, persisted in `localStorage` via `useSession` hook. The 6-char alphanumeric tierlist code is the join mechanism.

### Data flow

```
tierlists → items (belong to tierlist)
         → participants (belong to tierlist, unique name per tierlist)
                      → rankings (one per participant×item, score OR position)
```

Rankings store a `score` (0–10 float) regardless of ranking method. When method is `position`, `positionToScore()` in `lib/scoring.ts` converts position index to 0–10 before saving. Results always aggregate by averaging `score`.

Tier assignment thresholds (in `scoreToTier`): S/1 ≥8, A/2 ≥6, B/3 ≥4, C/4 ≥2, D/5 <2.

### Page routes

| Route | Purpose |
|---|---|
| `/` | Home — enter name, create or join. Accepts `?join=CODE` query param (set when redirected from an unknown tierlist link) to pre-fill join flow. |
| `/create` | 4-step wizard: name → tier format → ranking method → add items with optional image upload |
| `/[code]` | Lobby — host shares code/WhatsApp link, all see participant confirmation status in realtime |
| `/[code]/rank` | Ranking interface — `ScoreInput` (decimal 0–10) or `PositionSorter` (dnd-kit drag) depending on `tierlist.ranking_method` |
| `/[code]/results` | Server Component — computes averages, groups into tiers, renders `TierRow` list + `Podium` |

### Supabase clients

- `lib/supabase/client.ts` — `createBrowserClient`, used in Client Components and hooks
- `lib/supabase/server.ts` — `createServerClient` with `cookies()`, used only in Server Components (currently only `/[code]/results`)

### Realtime

`useRealtimeParticipants` subscribes to `postgres_changes` on `participants` and `tierlists` filtered by `tierlist_id`. It takes `initialParticipants` as a prop and syncs them in a separate `useEffect` (necessary because `useState` ignores prop changes after mount — the hook mounts before `loadData` completes).

### Image uploads

Images are uploaded client-side to Supabase Storage bucket `item-images` during `handleCreate` in `/create/page.tsx`. Local previews use `URL.createObjectURL` — render with `<img>` (not `next/image`) since `next/image` doesn't support `blob:` URLs.

### Key ESLint suppressions

The codebase uses `// eslint-disable-next-line react-hooks/set-state-in-effect` in several places where `setState` must be called inside a `useEffect` for localStorage hydration or Supabase data loading. This is intentional — do not remove these patterns.

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Both are public (protected by Supabase RLS). All tables have open read/insert policies; only `participants` and `tierlists` allow update.
