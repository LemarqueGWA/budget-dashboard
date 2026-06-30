# Budget Dashboard

Static, password-gated dashboard for a personal budget tracker. Served via GitHub Pages.

No financial data lives here — figures load at runtime from a private Google Sheet through a password-gated Apps Script Web App. The `/exec` URL in `app.js` returns nothing without the correct password.

Files: `index.html`, `styles.css`, `app.js`, plus `period.js` / `aggregate.js` (shared calculation logic).
