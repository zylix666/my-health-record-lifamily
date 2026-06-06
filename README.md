# my-health-record

A project that consolidates water, fiber, and protein intake tracking.

## Discussion sessions

Use separate chat sessions for focused frontend changes:

- Today: dashboard, goal progress, reminders, and check-in.
- Add: food selection and intake record creation.
- Daily detail: daily record lookup, editing, and deletion.
- Trends: statistics, charts, and insights.
- Food library: reusable food item lookup, creation, editing, deletion, and seed food behavior.
- Settings: goals, backup, data clearing, and PWA status.

Backend integration and shared behavior should stay coordinated across repository, storage, migrations, backups, and cross-page refresh logic.

## Mobile app mode

The browser URL bar cannot be hidden while the app is opened as a normal Chrome tab. To make it look and behave like an app, install it as a PWA from an HTTPS URL, then launch it from the phone home screen.

Expected result after a proper PWA install:

- The app opens in standalone mode.
- Chrome's URL input box is hidden.
- The app shell can be opened offline after the first complete load.

If you open `http://192.168.x.x:4173` directly in Chrome, it will still look like a web page because that is a normal browser tab and it is not a secure origin for service worker installation.

Full offline install checklist: [docs/mobile-offline.md](docs/mobile-offline.md).
