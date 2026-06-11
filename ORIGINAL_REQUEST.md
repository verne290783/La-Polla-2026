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
