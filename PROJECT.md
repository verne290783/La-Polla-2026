# Project: La Polla 2026 - Podium and QF Bracket Fix

## Architecture
The application is a Next.js prediction portal.
- Bracket Logic: Matches are generated and updated via `src/lib/fifa/bracket.ts`.
- Podium Simulation: Displays the champion predictions and simulated podium on the "Polla" tab (`PollaTab` or similar) and the Leaderboard Player Modal.
- Read-only integrity: No database updates should be made for these verification/simulation steps; all data should remain intact.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | Exploration & Impact Analysis | Identify exact location of `qfPlan` in `bracket.ts` and inspect podium/champion prediction rendering/simulation in the UI components (Polla tab, Leaderboard modal). | None | DONE (a8d1a022, 98e35216, 220ce513) |
| 2 | Code Correction | Update `qfPlan` in `src/lib/fifa/bracket.ts` (Match 98, Match 99). Verify logic does not disrupt other matches. | Milestone 1 | DONE (48b8b656) |
| 3 | Verification & Verification | Run production build (`npm run build`), verify tests, run forensic audit checks to confirm integrity. | Milestone 2 | DONE (864dfc41) |
| 4 | GitHub Submission | Push all modifications and clean status to GitHub remote repo. | Milestone 3 | PENDING (Staged, awaiting user approval) |

## Code Layout
- `src/lib/fifa/bracket.ts` — Bracket configuration and tournament progression structure.
- `src/components/dashboard/PollaTab.tsx` / similar UI tabs — Renders the tournament podium and bracket.
- `src/components/dashboard/LeaderboardTab.tsx` or Leaderboard modals — Shows details modal for players.
- `scripts/test-stats-mathematics.ts` / tests — Mathematical validation scripts.

## Interface Contracts
- `qfPlan`: Map of quarterfinal matches to their feeds (winners of prior rounds).
- Dynamic Podium Simulation: Must match champion predictions (`champion_predictions` table) for users who have completed their brackets.
