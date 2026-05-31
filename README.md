# my-health-record

A project that consolidates water, fiber, and protein intake tracking.

## Mobile app mode

The browser URL bar cannot be hidden while the app is opened as a normal Chrome tab. To make it look and behave like an app, install it as a PWA from an HTTPS URL, then launch it from the phone home screen.

Expected result after a proper PWA install:

- The app opens in standalone mode.
- Chrome's URL input box is hidden.
- The app shell can be opened offline after the first complete load.

If you open `http://192.168.x.x:4173` directly in Chrome, it will still look like a web page because that is a normal browser tab and it is not a secure origin for service worker installation.

Full offline install checklist: [docs/mobile-offline.md](docs/mobile-offline.md).
