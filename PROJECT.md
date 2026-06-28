# Project: La Polla 2026 - Advanced Stats & Group Control

## Architecture
The application is a Next.js prediction portal built with Tailwind CSS and Supabase.
- Profiles and Groups: Users can join groups, and their rankings/positions are tracked per group in `pool_members` and globally in `profiles`.
- Predictions: Predictions are split into Part 1 (full tournament/bracket predictions) and Part 2 (live, match-by-match predictions).
- Stats display: Both the user Profile screen (`ProfileTab.tsx`) and the Leaderboard Player Modal display prediction statistics like matches predicted, exact scores, efficiency, etc.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Impact Analysis | Identify where profile stats, leaderboard modals, group select, and user predictions are stored/rendered. Define metrics calculation logic. | None | DONE (6a949c90) |
| 2 | DB & API Audit/Implementation | Verify if any database tables, RPCs, or backend endpoints require updates. | Milestone 1 | SKIPPED |
| 3 | Frontend Integration | Implement group selector with default best position, split tabs (Part 1, Part 2, Consolidado), and add new goal metrics in Profile & Modal. | Milestone 2 | DONE (8334c542) |
| 4 | Verification & Audit | Add unit/integration tests for mathematical correctness, run lint/build, and run Forensic Auditor. | Milestone 3 | IN_PROGRESS (b953ca4f) |
| 5 | Submission & push | Git commit and push changes to GitHub. | Milestone 4 | PLANNED |

## Code Layout
- `src/components/dashboard/ProfileTab.tsx` — Handles the Profile view, including the new group selector with intelligent default selection and tabbed statistics.
- `src/components/dashboard/LeaderboardTab.tsx` — Leaderboard list view and embedded player details stats modal.
- `src/lib/stats-helpers.ts` — Computes statistics (Part 1, Part 2, and Consolidado) for users.
- `src/lib/db-helpers.ts` — Houses queries to get profile, teams, matches, pools, and predictions.
- `scripts/test-stats-mathematics.ts` — Integration tests validating mathematical correctness.

## Interface Contracts
- `calculateUserPart1Stats(p1Predictions: any[], matches: Match[]): UserStats`
- `calculateConsolidatedStats(p1Stats: UserStats, p2Stats: UserStats): UserStats`
- Default Group Rank: resolved by sorting joined pools by user rank inside each pool (computed from `getPoolMembersRanking` ascending).
- Ties in Winner/Loser goals matched:
  - Winner: if tie (`realHome === realAway`), check home score match.
  - Loser: if tie (`realHome === realAway`), check away score match.
