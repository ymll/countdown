# Countdown Timer

A personalised countdown timer. Pick a date — a trip, a reunion, a birthday —
and the page counts down the days, hours, minutes and seconds until it arrives,
under a sky that changes with the time of day and a city skyline at the bottom.

Live at: https://ymll.github.io/countdown/

## How to use

- Open the page. Click the gear (⚙️) in the top right and pick a date.
- The date is saved in a cookie and in the page URL, so the link is shareable:
  `?countdowndate=2027-06-01&start=2026-11-06` opens the same countdown.
- Under the countdown, a loading bar shows the journey: a plane (✈) flies
  from the dot (•, the day the date was picked) towards the heart (❤, the
  target date) as time passes.
- When the day arrives the page says "Happy Reunion!"; ten days after the
  date it suggests it's "Time to plan for next trip!"

## Run it locally

No build step, no dependencies to install — it's plain HTML, CSS and JavaScript:

```sh
python3 -m http.server 8000
```

then open http://localhost:8000/

## Files

- `index.html` — page structure, including the loading bar (`#progress`)
- `js/index.js` — countdown maths, sky colours, settings modal, loading bar
- `css/index.css` — styles, including the loading bar
- `resources/skyline.png` — the skyline silhouette along the bottom
  (`skyline.psd` is the Photoshop source for it)

## Notes

- The countdown counts down to midnight UTC on the chosen date.
- The loading bar only appears once a start date is known — the day the
  target was picked. A shared link carries both dates, so the bar keeps
  working for whoever opens it. A target opened without a start date
  (e.g. an old `?countdowndate=` link) shows the countdown without the bar.
- The sky background follows the local clock: night, dawn, day and dusk,
  with a slow colour fade through the 5pm, 4pm and 6pm hours.
