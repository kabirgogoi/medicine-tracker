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

## Repository-only development workflow

For now, this project is developed and built entirely through GitHub. Local development is not required.

All changes must follow this workflow:

1. Create a new feature branch from `main`.
2. Make and commit the change only on that feature branch.
3. Open a pull request targeting `main`.
4. Do **not** merge the pull request automatically. The repository owner reviews and merges it manually.

The CI workflow builds every pull request and every push to `main`.

## Firebase setup required

Create/select a Firebase project, then complete these items in the Firebase console:

1. Register a **Web app** in the Firebase project.
2. Create a **Cloud Firestore** database.
3. Enable **Firebase Hosting** for the project.
4. If Firebase Authentication is used by the app, enable the required sign-in provider(s) in **Authentication > Sign-in method**.
5. Copy the Firebase Web App configuration values into GitHub repository variables as described below.
6. Create a Google/Firebase service-account credential with permission to deploy Firebase Hosting and Firestore rules, then save the complete service-account JSON as the GitHub Actions secret described below.

Firebase Hosting serves the Vite production output from `dist/`, and `firebase.json` contains the SPA rewrite and Firestore rules configuration.

## GitHub Actions configuration

In GitHub, open **Settings > Secrets and variables > Actions**.

### Repository variables

Create these repository **Variables**. The names must match exactly:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
FIREBASE_PROJECT_ID
```

The six `VITE_FIREBASE_*` values come from **Firebase Console > Project settings > General > Your apps > Web app > SDK setup and configuration > Config**.

`FIREBASE_PROJECT_ID` is the Firebase project ID used by the deployment workflow. It will normally be the same value as `VITE_FIREBASE_PROJECT_ID`.

Firebase's web-app configuration is delivered to the browser and is not treated as a server credential. Do not put service-account private keys in any `VITE_*` variable.

### Repository secret

Create this GitHub Actions **Secret**:

```text
FIREBASE_SERVICE_ACCOUNT
```

Its value must be the **entire JSON service-account credential** used for Firebase deployment. Never commit this JSON file or its private key to the repository.

### GitHub Actions permissions

The workflows request `contents: read`, and the Hosting deployment workflow also requests `checks: write` and `pull-requests: write` so Firebase Hosting can report preview deployments on pull requests.

## CI/CD behavior

- **Pull request to `main`:** installs dependencies, type-checks/builds the Vite app, and deploys a temporary Firebase Hosting preview channel.
- **Push to `main`:** repeats the checks/build and deploys Firebase Hosting to the live channel. It also deploys `firestore.rules`.
- **No workflow merges pull requests.** Production deployment happens only after the repository owner manually merges a PR into `main`.

Firebase Hosting preview URLs use the configured Firebase project and therefore can interact with its real backend resources. Treat previews accordingly.

## Build environment

GitHub Actions uses Node.js 22. The build steps are:

```sh
npm install
npm run format:check
npm run build
```

The production output is written to `dist/`.

## Firebase environment variables

The application reads these variables at Vite build time:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

`.env.example` documents the same names for reference. Real deployment values belong in GitHub Actions repository variables, not committed environment files.

## Firestore

The app uses two top-level collections:

- `medicines` — medicine details, active state, prescription dates, and daily schedule times.
- `doseLogs` — one document per scheduled dose/day containing taken/missed status and actual taken time.

There is no database migration step. Add the initial medicines through the UI after deployment.

The repository contains `firestore.rules`. Review those rules whenever authentication or the application's data model changes.

## Firebase Hosting

The repository includes `firebase.json` with `dist/` as the Hosting public directory and an SPA rewrite to `index.html`.

The GitHub workflow uses Firebase Hosting preview channels for pull requests and the live channel for pushes to `main`. Firestore rules are deployed only from `main`.
