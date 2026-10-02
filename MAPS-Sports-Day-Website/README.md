# MAPS Sports Day 2026

A responsive recreation of the MAPS Sports Day website using plain HTML, CSS and JavaScript. Registration and organiser access use the Supabase project configuration supplied in the starter archive. The crest, archive image and typefaces are stored locally under `assets/`.

## Project structure

```text
sports-day/
├── index.html
├── style.css
├── script.js
├── supabase-config.js
├── supabase-schema.sql
├── README.md
├── assets/
│   ├── fonts/
│   └── images/
└── pages/
    ├── events.html
    ├── schedule.html
    ├── results.html
    ├── standings.html
    ├── gallery.html
    ├── help.html
    ├── register.html
    ├── registration-success.html
    ├── organizer-login.html
    └── organiser-dashboard.html
```

## Run it in VS Code

1. Open the `sports-day` folder in VS Code.
2. Install or enable the Live Server extension if it is not already available.
3. Open `index.html`, then choose **Go Live** from the status bar or use **Open with Live Server** from the file context menu.
4. The public pages open as a static site. Registration and organiser sign-in need an internet connection and a configured Supabase project.

## Set up registration and organiser access

1. In Supabase, open **SQL Editor** and run `supabase-schema.sql`. It creates the student/event tables, row-level security policies, admin check, and registration function. If you already ran an earlier version of this setup, it replaces that registration function with the current form fields.
2. `supabase-config.js` contains the project URL and browser-safe publishable key supplied in the archive. A publishable key is intended for browser use; never put a secret or service-role key in this file.
3. In **Authentication → Settings**, turn off public sign-ups. In **Authentication → Users**, create an organiser account and copy its user UUID.
4. Add that UUID to the admin allowlist in SQL Editor:

   ```sql
   insert into public.sports_day_admins (user_id)
   values ('PASTE-ORGANISER-USER-UUID-HERE');
   ```

5. Open `pages/organizer-login.html` and sign in with that account. The dashboard checks both the Supabase session and the admin allowlist before it reads registration records.

Public registration sends the entered name, student ID, course/year, gender, and selected events to the Supabase project in `supabase-config.js`. The student tables are readable only to authenticated organisers under the included row-level security policies.

## Replace or add images

- Keep image files in `assets/images/` and use relative paths in the HTML. For example, a root page uses `assets/images/photo.jpg`, while a page in `pages/` uses `../assets/images/photo.jpg`.
- The archive image is `sports-2025-a.jpg`; the header crest is `maps-logo.png`.
- The hero track is the editable vector file `track-scene.svg`. Replace it with another SVG or image while keeping its view box or aspect ratio close to the existing artwork.
- Use descriptive `alt` text for informative images. Use `alt=""` for decorative images.

## What works

- Registration validates required fields, course/year choices, event limits, and the 800m eligibility rule before calling the database function.
- Successful registrations open a confirmation page with the selected events and registration reference.
- Organiser sign-in uses Supabase Auth and checks the organiser allowlist. The dashboard filters registrations by competition division and event, searches participant details, and exports the selected event as CSV.
- Event category filters, schedule filters, the mobile menu, gallery viewer, motion toggle, and scroll reveals work in the browser.
