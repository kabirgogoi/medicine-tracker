# Medicine Tracker

A distraction-free medicine schedule and dose tracker built with React, Firebase Hosting, and Cloud Firestore.

## Features

- Upcoming medicine is the main focus.
- Confirm a dose as taken; the current date/time is used by default.
- Change the actual time a dose was taken.
- Mark a dose as missed.
- Add, edit, activate/deactivate, or remove medicines.
- Add/remove any number of daily dose times.
- Optional start/end dates for short prescriptions.
- Dose history is stored in Firestore.

## Firebase configuration

Create a Firebase web app and Firestore database. Copy `.env.example` to `.env.local` and fill in the Firebase web-app configuration values.

For repository-based deployment, configure the same `VITE_FIREBASE_*` variables in the build environment rather than committing a real `.env` file.

The Firebase web configuration is not a server secret, but keeping environment-specific project configuration outside the source tree makes it easy to use different Firebase projects for development and production.

## Firestore

The app uses two top-level collections:

- `medicines` — medicine details, active state, prescription dates, and daily schedule times.
- `doseLogs` — one document per scheduled dose/day containing taken/missed status and actual taken time.

Because authentication is intentionally not implemented yet, `firestore.rules` currently allows public access to these two collections. This is appropriate only for the requested no-auth prototype. Add Firebase Authentication and restrictive rules before storing private/multi-user data.

There is no database migration step. Add the initial medicines through the UI after deployment.

## Local development

```sh
npm install
cp .env.example .env.local
npm run dev
```

## Build

```sh
npm run build
```

The production output is written to `dist/`.

## Git repository deployment

The repository includes `firebase.json` for Firebase Hosting. Configure your Firebase Hosting GitHub integration to build the repository and deploy `dist/`. Add the `VITE_FIREBASE_*` values to the deployment/build environment.

The Hosting configuration rewrites all routes to `index.html` for the React single-page application.

## Formatting

```sh
npm run format
npm run format:check
```
