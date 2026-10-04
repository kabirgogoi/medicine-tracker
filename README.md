# Medicine Tracker

A distraction-free medicine schedule and dose tracker using React, Cloudflare Workers, and D1.

## Included

- Next medicine is the primary UI.
- Confirm taken with the current date/time by default, or adjust the actual time.
- Mark doses missed.
- Today's schedule/status list.
- Add, edit, and deactivate medicines.
- Add, remove, and edit any number of daily times.
- Optional prescription start/end dates.
- D1 history of taken/missed doses.
- Seed data for Mofo DX (6x), SofiRx Ultra (4x), and CyclopRx (3x).

## D1 configuration

The repository deliberately does **not** contain the D1 database name or database ID.

The Worker expects a D1 binding named `DB`. Configure that binding in the Cloudflare dashboard for the deployed Worker and select the D1 database there. The application only accesses `env.DB`; it does not need to know the database name or ID.

Apply the SQL files in `migrations/` to the D1 database using the Cloudflare dashboard or Wrangler with the database selected/configured outside this repository.

## Cloudflare deployment

1. Run `npm install`.
2. Create/select your D1 database in Cloudflare.
3. Apply the files in `migrations/` in order.
4. Connect this GitHub repository in Cloudflare Workers Builds.
5. Build command: `npm run build`.
6. Deploy command: `npx wrangler deploy`.
7. In the Worker's bindings/settings, add the D1 database with variable name `DB`.

## Formatting

Run:

```sh
npm run format
```

Check formatting without changing files:

```sh
npm run format:check
```
