# Project: La Polla - Deletion of Groups and Vercel Deploy

## Architecture
This is a Next.js application integrated with Supabase for data persistence and authentication.
- **Frontend**: React, Tailwind CSS, Next.js.
- **Database**: Supabase PostgreSQL. Key tables: `pools` (groups), `pool_members` (members of pools), `full_tournament_predictions`, `phase_predictions`, `champion_predictions` (predictions).
- **Cascade Deletions**: Group deletion (`pools` table) must cascade delete related records in `pool_members` and predictions tables.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Remove "Simulador" Text | Edit `src/components/dashboard/FixtureTab.tsx` to remove "(Simulador)" from the header. | None | DONE |
| 2 | Group Deletion Implementation | Add deletion UI/UX in `src/components/dashboard/GroupsTab.tsx` for group creators. Ensure Supabase cascade deletes are handled. Update UI state gracefully. | None | DONE |
| 3 | Vercel Deployment Guide | Create `docs/deploy_vercel.md` with step-by-step instructions. | None | DONE |

## Code Layout
- `src/components/dashboard/FixtureTab.tsx` - Fixture tab UI
- `src/components/dashboard/GroupsTab.tsx` - Groups management tab
- `docs/deploy_vercel.md` - Deployment documentation
- `supabase_schema.sql` - Local representation of Supabase schema (if any)
