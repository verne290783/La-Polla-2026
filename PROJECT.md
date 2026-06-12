# Project: La Polla 2026 - Extra Time Goals in Points Computation

## Architecture
The application is a Next.js prediction portal built with Tailwind CSS and Supabase.
- Points computation: Handles the calculation of points awarded to users based on their match predictions compared to actual match results.
- Rules Simulator: A frontend/backend interactive rule simulator displaying how points are calculated under different outcomes.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Impact Analysis | Identify where points computation and rules simulation are implemented, and analyze the database structure (matches, predictions, stages) to determine how to identify knockout stage matches that went to extra time. | None | IN_PROGRESS |
| 2 | Implementation of Extra-Time Rules | Modify points computation (SQL/TS) and rules simulator to compute predicted goals points including extra time goals for matches that go to extra time after a draw in the regular 90 mins (Round of 32/knockout stages onwards). | Milestone 1 | PLANNED |
| 3 | Testing and Verification | Add tests, run the build/tests, verify correctness, and pass Forensic Auditor integrity audit. | Milestone 2 | PLANNED |

## Code Layout
- [TBD based on Milestone 1]

## Interface Contracts
- [TBD based on Milestone 1]
