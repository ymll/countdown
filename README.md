# Little Moments — Countdown

A free, no-account countdown for reunions, trips, birthdays and the small milestones that make life feel exciting. The original idea was personal: counting down until a long-distance couple could see each other again. This refresh keeps the plane-to-heart journey, and makes the tool useful for more than one date.

**Live site:** https://ymll.github.io/countdown/

## Use it
- Add as many named dates as you like.
- Pick a local date and time; the browser handles your device's timezone and daylight-saving rules.
- Switch between saved countdowns, remove old ones, and share a link to one countdown.
- Dates are stored only in this browser's local storage. A shared link contains only the selected event name and target time; it does not expose the rest of your list.
- No account, server, analytics or third-party app dependency.

## Run locally
No build step or dependencies:
```sh
python3 -m http.server 8000
```
Open http://localhost:8000/.

## Compatibility
- Existing links using `?countdowndate=YYYY-MM-DD` are still imported as a “Next reunion” countdown.
- Shared links use `?at=<ISO timestamp>&name=<event name>`.
- Existing v1 browser cookies are not migrated automatically; open an old shared URL once to import it.

## Tests
Run the pure logic tests with Node.js:
```sh
node --test
```

## Project files
- `index.html` — accessible page structure and create dialog
- `css/index.css` — responsive visual design
- `js/countdown-core.js` — tested date/progress helpers
- `js/index.js` — local-first app, saved list, share links and live timer
