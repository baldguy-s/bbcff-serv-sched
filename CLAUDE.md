# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Church service-schedule app for BBCFF: three standalone, static HTML pages with no build step, no
package manager, and no server. Each file is fully self-contained (inline `<style>` and `<script>`,
Google Fonts via CDN link). Deployed via GitHub Pages from the `main` branch root:
https://baldguy-s.github.io/bbcff-serv-sched/

- `schedule-admin.html` — editor for the master service schedule (Sunday AM/PM, Wednesday, and
  one-off "special" services). Reads/writes `schedule-data.json`.
- `song-leader-admin.html` — editor for song-leader assignments only. Reads the master
  `schedule-data.json` (read-only) to know which dates/services exist, merges in its own
  song-leader records, and writes `song-leader-data.json`.
- `schedule-display.html` — read-only public view. Fetches both JSON files and renders the combined
  schedule.
- `schedule-data.json`, `song-leader-data.json` — the two data stores (JSON arrays of entry
  objects), committed directly to this repo.

There is no local dev server and nothing to install for the app itself. To work on a page, open the
HTML file directly in a browser (or serve the folder statically) and point it at this repo via the
GitHub token flow described below.

## Commands

The only tooling in this repo is a post-deploy sanity check (`package.json` / `scripts/`):

```
npm install                        # one-time
npx playwright install chromium-headless-shell   # one-time, downloads a browser binary
npm run check-site                 # loads the live GitHub Pages site headlessly, reports JS/console/request errors
```

`check-site` hits the *deployed* `https://baldguy-s.github.io/bbcff-serv-sched/` pages, not local
files — run it after pushing to `main` to confirm the deploy actually rendered without errors. A
plain HTTP fetch of these pages isn't a valid check on its own: the schedule content is rendered
client-side after fetching the JSON data files, so tools that don't execute JS (e.g. WebFetch) will
misreport a working page as blank/broken.

## Persistence model — read this before touching data flow

There is no backend. Both admin pages read and write JSON files **in this same GitHub repo** at
runtime using the GitHub Contents API (`ghGetFile`/`ghPutFile` in each file), authenticated with a
GitHub Personal Access Token (`repo` scope) that the user pastes in once via a settings prompt and
that is stored in `localStorage` (per-page key: `gh_pat_choir_schedule` for schedule-admin,
`gh_pat_song_leader_schedule` for song-leader-admin). Each save:

1. Re-fetches the file to get the current `sha` (last-write-wins if two people edit concurrently).
2. PUTs the full JSON array back with an auto-generated commit message.

`schedule-display.html` instead fetches the raw files from `raw.githubusercontent.com` (no token
needed, read-only) and also hits the GitHub commits API to show a "last updated" timestamp.

Because saves are real commits, editing through the admin UI and editing the JSON/HTML by hand in
this repo are the same action — keep that in mind when scripting bulk data changes (a direct file
edit is equivalent to what the browser would PUT).

`GH_OWNER`, `GH_REPO`, `GH_BRANCH`, and the data file path are hardcoded near the top of each file's
`<script>` block — update all three admin/display files together if the repo is ever renamed/moved.

## Data shape

Entries in `schedule-data.json` are objects with: `id`, `date` (`YYYY-MM-DD`), `type` (one of
`sunday_am`, `sunday_pm`, `wednesday`, `special`), `order` (int, controls display/sort order),
`choir` (`{slot, solo}`), `songLeaders`, `speakers`, `singers` (each a list of `{id, name, ...}`
person records). `special` entries additionally carry a `specialName`.

`song-leader-data.json` entries mirror the same `id`/`date`/`type`/`order` fields (kept in sync from
`schedule-data.json` by `song-leader-admin.html`'s merge step) but only carry `songLeaders` — it's a
derived, narrower view of the master schedule, not an independent source of truth.

`schedule-admin.html` also references `schedule-people.json` (`GH_PEOPLE_PATH`) for a saved-names
directory used in autocomplete: a flat JSON array of name strings, manually added/removed from that
page's UI.

## Conventions specific to this repo

- CSS custom properties (`--paper`, `--ink`, `--red`, etc.) plus a `.dark-mode` class on `:root`
  drive theming; dark-mode overrides are defined in `:root.dark-mode{...}` at the top of each file's
  `<style>` block. The header banner intentionally stays light gray in both themes because the church
  logo image has dark lettering baked in — don't "fix" this to follow the dark palette.
- Design tokens (colors, fonts) are kept in sync with the sibling `choir-vault` project — if you
  change the palette here, check whether it should change there too.
- Text size and dark-mode preferences are per-browser via `localStorage` (`TEXT_SIZE_KEY`,
  `DARK_MODE_KEY`), not stored in the JSON data.
