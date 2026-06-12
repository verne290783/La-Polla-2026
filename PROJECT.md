# Project: La Polla 2026 Interactive Rules & Live Knockout Draws

## Architecture
The application is a Next.js prediction portal built with Tailwind CSS and Supabase.
- **Landing Page (`src/app/page.tsx`)**: Public welcome page, displays the login/registration forms. Needs a public button to read rules.
- **Dashboard (`src/app/dashboard/page.tsx`)**: Private dashboard, switches between home, fixture, groups, leaderboard, and profile tabs. Needs a new "Reglas" tab.
- **RulesTab (`src/components/dashboard/RulesTab.tsx`)**: A new interactive tab displaying the complete rules in accordion style with dark theme, border accents, gold and green gradients.
- **FixtureTab (`src/components/dashboard/FixtureTab.tsx`)**: Manages predictions. Part 2 represents the live prediction feed, which needs interactive knockout tiebreaker selection.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration | Identify current component layout for landing page, dashboard navigation, and Part 2 predictions. | None | DONE |
| 2 | Rules Section Implementation | Create RulesTab component, add navigation item in Dashboard (desktop & mobile), and add public modal on Landing Page. | Milestone 1 | DONE |
| 3 | Part 2 Knockout Tiebreaker | Add interactive winner selection for ties in knockout phase of Part 2, and handle loading/saving of predicted winner team. | Milestone 2 | DONE |
| 4 | Verification & Build | Verify build and lint, extend test suite to assert correct saving and rendering of knockout winners, and verify public rules modal. | Milestone 3 | DONE |

## Code Layout
- `src/components/dashboard/RulesTab.tsx` (New component)
- `src/components/dashboard/FixtureTab.tsx` (Modified for R3)
- `src/app/dashboard/page.tsx` (Modified for R1)
- `src/app/page.tsx` (Modified for R1)

## Interface Contracts
- `RulesTab`: Simple presentation component, handles its own open/close state for collapsibles.
- `saveP2Prediction`: Backend RPC/upsert function already supports `predicted_winner_team_id` (via `winnerId` parameter).
- `FixtureTab`: Load/save predictions for Part 2 must map `winnerId` to `predicted_winner_team_id` and vice versa.
