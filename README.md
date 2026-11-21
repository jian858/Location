# Here: my location

A mobile-friendly location and personal navigation web app. It helps people find and share their current location, save favourite places, find nearby services, remember parking spots, and keep a small local location history.

## Features

- **Here:** current coordinates, OpenStreetMap preview, address lookup, share/copy/WhatsApp actions, and an emergency SMS draft.
- **Places:** save, rename, delete, navigate to, and set arrival alerts for saved places.
- **Nearby:** open Google Maps searches for common services or a custom search around the current position.
- **Parking:** save the parking coordinates, a note, and an optional compressed photo.
- **More:** emergency contact, light/dark/system theme, CSV import/export, and recent location history.

## Project structure

| File | Purpose |
| --- | --- |
| `index.html` | App page and navigation structure |
| `style.css` | Responsive layout and themes |
| `core.js` | Shared helpers, state, local storage, and tabs |
| `location.js` | Geolocation, map preview, and reverse geocoding |
| `sharing.js` | Share, copy, WhatsApp, and emergency SMS |
| `places.js` | Saved places and arrival alerts |
| `parking.js` | Parking spot and photo handling |
| `storage.js` | Location history and CSV backup/import |
| `app.js` | Event handlers and app startup |
| `manifest.json` | Progressive Web App metadata |
| `sw.js` | App-shell caching for offline loading |
| `icons/icon.svg` | Scalable app icon |

The JavaScript files are loaded as classic scripts in order by `index.html`, so they share the app's state and helper functions without a build step.

## Run locally

Geolocation and service workers require a secure context. Use HTTPS hosting or a local development server such as:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000` in a supported browser. (Browsers treat localhost as a secure development context.)

## Deploy with GitHub Pages

1. Open the repository's **Settings → Pages**.
2. Under **Build and deployment**, select **Deploy from a branch**.
3. Choose the `main` branch and `/(root)`, then save.
4. Wait for GitHub Pages to publish the site.
5. Open the published HTTPS URL and allow location access.

The manifest, icon, scripts, stylesheet, and service worker use relative paths so they work from a GitHub Pages project URL such as `https://OWNER.github.io/Location/`.

## Privacy and data

- Saved places, parking information, emergency contact, theme, and history are stored in this browser's local storage. They are not synced to an account or another device.
- Location is requested from the browser only after permission is granted.
- Address lookup uses the OpenStreetMap Nominatim service. The map preview uses OpenStreetMap.
- Nearby searches and navigation open Google Maps.
- The emergency action opens the phone's SMS composer; the user reviews and sends the message.
- Arrival alerts work only while the page is open and location updates are being delivered. This is not a background tracking service.

## Offline behavior

The service worker caches the app's own files so the interface can reopen offline after a successful first load. Live GPS, address lookup, online maps, nearby search, and message sharing still need the relevant browser/device capability and/or a network connection.

## Important limitations

This is a client-side personal utility, not a location-sharing server. It has no accounts, cloud database, administrator panel, or real-time sharing between users. Do not use it as an emergency response system or as a substitute for emergency services.
