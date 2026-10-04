# Medicine Tracker

A distraction-free medicine schedule and dose tracker using React, Cloudflare Workers and D1.

## Included
- Next medicine is the primary UI
- Confirm taken with current date/time by default, or adjust the actual time
- Mark doses missed
- Today's schedule/status list
- Add/edit/deactivate medicines
- Add/remove/edit any number of daily times
- Optional prescription start/end dates
- D1 history of taken/missed doses
- Seed data for Mofo DX (6x), SofiRx Ultra (4x), and CyclopRx (3x)

## Cloudflare setup
1. Run `npm install`.
2. Create D1: `npx wrangler d1 create medicine-tracker`.
3. Replace `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.jsonc`.
4. Apply migrations: `npm run db:migrate:remote`.
5. Connect this GitHub repository in Cloudflare Workers Builds.
6. Build command: `npm run build`; deploy command: `npx wrangler deploy`.

For end-to-end local testing: `npm run db:migrate:local`, then `npm run build && npx wrangler dev`.
