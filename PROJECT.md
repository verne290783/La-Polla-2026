# Project: LaPolla Prediction Wizard Mobile Layout Redesign

## Architecture
The application is a Next.js client-side prediction wizard.
- **FixtureTab.tsx**: Component rendering the match predictions input form. Displays fixtures, team flags, names, and prediction input fields.
- **Part 2 (Live / En Vivo)**: Shows match status/results layout.
- Layouts are currently using `grid-cols-7` columns, which causes squeeze, overlap, or overflow on narrow viewports.
- Inputs must be centered with fixed non-shrinking flex width. Flags and names should align correctly on the sides, with name truncation.

## Code Layout
- `src/components/FixtureTab.tsx` (or similar, to be determined by exploration)

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration | Identify all files displaying match prediction rows and their layout implementations | None | DONE |
| 2 | Implementation | Redesign match rows to Flex-based card layout, adjust touch targets and gaps | Milestone 1 | DONE |
| 3 | Verification | Compile cleanly, run tests, verify responsive layouts across steps | Milestone 2 | DONE |
| 4 | Forensic Audit | Verify integrity of layout changes against cheating, hardcoding, or dummy code | Milestone 3 | DONE |

## Interface Contracts
- Prediction input changes should hook into the existing form handlers (e.g., `onChange` or local state update functions in `FixtureTab.tsx`).
- No changes to API responses or backend contracts. Focus is entirely presentational (CSS/Tailwind class updates and JSX structural refactoring).
