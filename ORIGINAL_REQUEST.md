# Original User Request

## Initial Request — 2026-06-10T19:09:47-05:00

You are the Project Orchestrator (teamwork_preview_orchestrator).
Your coordination workspace directory is: c:\Users\Edison\Desktop\LaPolla\.agents\orchestrator_group_filtering
The project repository directory is: c:\Users\Edison\Desktop\LaPolla

Your task is to fix the Group Stage match filtering bug in the prediction wizard.

Requirements:
R1. Replace external_match_id string parsing with static group mapping
- Define a static map of team IDs to their respective group letters (A-L).
- Update the group-filtering logic in `FixtureTab.tsx` and `bracket.ts` to resolve the group of a match from its team IDs instead of trying to parse it from `external_match_id`.

Acceptance Criteria:
UI & UX:
- The Group Stage matches for the selected group (A-L) render correctly in Step 1 of the prediction wizard (Parte 1).
- Changing active groups in the wizard dynamically updates the list to show matches for the selected group.

Reliability:
- Standings tables and best-third-place calculations work correctly based on the static group mapping.
- Next.js compiles cleanly with no typescript errors.

Please initialize your briefing, planning, and execution phases. Output a handoff or a progress update when done. Report completion once all tasks are validated and the project compiles cleanly.

## Follow-up — 2026-06-11T14:41:18Z

Redesign the match prediction layout and input fields in the prediction wizard (`FixtureTab.tsx`) to improve mobile usability, increase touch target sizes, and prevent inputs from overlapping with flags and team names on mobile browsers.

Working directory: c:\Users\Edison\Desktop\LaPolla
Integrity mode: development

## Requirements

### R1. Responsive Flex-based Match Card Layout
- Replace the rigid 7-column grid layout (`grid-cols-7`) used for match rows in all wizard steps and in Part 2 (Live / En Vivo) with a responsive layout (such as a flexbox layout: `flex items-center justify-between`).
- Ensure the home team (name and flag) is aligned to the right on the left side, the away team (flag and name) is aligned to the left on the right side, and the inputs are centered with a fixed non-shrinking width (`flex-shrink-0`).
- Truncate long team names safely on small screens to ensure they do not squeeze or push the inputs.

### R2. Enhanced Touch Targets and Spacing
- Increase the size of the score input fields on mobile devices to a minimum of `w-12 h-12` (48px) or `w-11 h-11` (44px) to conform with mobile touch target accessibility standards (allowing smaller sizes on desktop, e.g., `sm:w-10 sm:h-10`).
- Ensure there is adequate margin/gap (minimum `gap-3` or equivalent padding) between the flag icon and the score input fields to prevent accidental finger taps.

## Acceptance Criteria

### UI & UX (Mobile)
- [ ] Match rows do not overflow their cards on narrow screens (down to 320px).
- [ ] Team flags and names do not overlap with or touch the prediction input fields.
- [ ] Score inputs have a touch target of at least 44x44px on mobile devices.
- [ ] Tapping anywhere near the input fields accurately focuses the input without hitting the flag icon or team name.

### Technical
- [ ] All wizard steps (Grupos, R32, Octavos, Cuartos, Semis, Final) and Part 2 (Live/En Vivo) reflect the new responsive layout.
- [ ] The application compiles cleanly with `npm run build` and no linter warnings are generated.

## Follow-up — 2026-06-11T15:20:39Z

Improve the usability of the score input fields in the prediction wizard (`FixtureTab.tsx`) so that clicking or tapping an input automatically selects all text, and deleting the number allows the input to be temporarily empty (defaulting to 0 on blur).

Working directory: c:\Users\Edison\Desktop\LaPolla
Integrity mode: development

## Requirements

### R1. Auto-Select Input Text on Focus
- Add an `onFocus` event handler to all score input fields (for both Part 1 and Part 2 prediction fields in `FixtureTab.tsx`) that automatically selects the entire content of the input (using `e.target.select()`).
- This should make it so tapping or clicking the input immediately highlights the existing number, allowing it to be overwritten immediately upon typing.

### R2. Allow Temporary Empty State and Default to 0 on Blur
- Modify the change handlers (`onChange`) so that if the user deletes the value (leaving it empty), the state stores an empty string `""` or `null` instead of forcing a `0` immediately. This allows users to clear the field with backspace.
- Add an `onBlur` event handler to all score input fields that resets the value to `0` in the state if the input is left blank when focus is lost.
- Ensure that any bracket calculation or saving function treats empty values as `0` rather than causing errors or storing invalid data.

## Acceptance Criteria

### UI & UX
- [ ] Focusing/tapping any score input field (Group stage, knockouts, or Part 2) automatically highlights the entire number.
- [ ] Clearing a score input field with backspace leaves the input field empty (blank) while focused, rather than immediately reverting to `0`.
- [ ] Tapping outside or blurring the empty input field automatically resets its value to `0` in the state and UI.

### Technical
- [ ] Next.js compiles cleanly with `npm run build` and no typescript/linter errors are introduced.
- [ ] The E2E tests compile and pass.

