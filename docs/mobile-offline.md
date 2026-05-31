# Mobile Offline Install Checklist

This app is a PWA. For real offline use on a phone, the first install must happen from an HTTPS URL because service workers can only register on secure origins.

`http://192.168.x.x:4173` is useful for testing the UI on your phone, but it is not valid for offline PWA installation.

## Recommended Flow

1. Build the app:

   ```powershell
   npm.cmd run build
   ```

2. Deploy the `dist` folder to an HTTPS static host.

   Good options:

   - Cloudflare Pages
   - Netlify
   - Vercel
   - GitHub Pages

3. Open the HTTPS URL on the phone, for example:

   ```text
   https://your-health-record.pages.dev
   ```

4. Open Settings in the app and confirm the offline status says:

   ```text
   Secure source: yes
   Browser support: yes
   Cache service: active
   ```

5. In Chrome, choose Install app or Add to Home screen.

6. Launch Health Record once from the home screen and wait for the page to fully load.

7. Turn on airplane mode.

8. Launch Health Record again from the home screen.

The app should open without network access. Existing data is stored in the phone browser's IndexedDB.

## What Does Not Work

```powershell
npm.cmd run preview -- --host 192.168.x.x
```

A phone can open this LAN URL, and Chrome may let you add it to the home screen, but it is still HTTP. Chrome will not allow the service worker to control and cache the app shell, so the shortcut stops working when the computer server is stopped.

## Local HTTPS Option

You can test through local HTTPS, but the phone must trust your local certificate. The usual flow is:

1. Create a local HTTPS certificate with mkcert or a similar tool.
2. Install and trust the root CA on the phone.
3. Serve `dist` through HTTPS.
4. Open `https://192.168.x.x` on the phone.
5. Confirm the app Settings page says the offline status is active.

This is more work than deploying to an HTTPS static host, so the recommended MVP path is Cloudflare Pages or another HTTPS host.
