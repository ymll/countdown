// Personalised Countdown Timer
//
// The target date comes from, in order: the ?countdowndate= URL param,
// the countDownDate cookie, or nothing (then the page asks you to pick one).
// An optional time (?time=HH:MM, countDownTime cookie) refines the target
// to that time of day; without one the target is midnight (00:00). The
// date+time are wall time in the target's timezone (?tz=IANA name,
// countDownTz cookie, defaulting to the browser's local zone), so 9:00 in
// Tokyo means 9:00 Tokyo time, and a shared link counts to the same
// instant for everyone.
// The loading bar (issue #3) also needs a start date: the day the target
// was picked. It travels with the target as ?start= in the URL and in the
// countDownStart cookie, so a shared link keeps its progress. A saved timer
// from before the bar existed has no start, so on load it is given a start
// of today (and saved) instead of hiding the bar forever.

// Target and start as Date objects, or null until they are known.
// countDownTime is the target's time of day, "HH:MM" (default "00:00").
// countDownTz is the target's IANA timezone (default: the browser's local).
var countDownDate = null;
var countDownStart = null;
var countDownTime = "00:00";
var countDownTz = null;

// --- storage (cookies), guarded so a blocked store can't kill the app ---
function safeGetCookie(name) {
  try {
    var value = "; " + document.cookie;
    var parts = value.split("; " + name + "=");
    if (parts.length == 2) return parts.pop().split(";").shift();
  } catch (e) { /* cookies unavailable: behave as if no cookie was set */ }
  return undefined;
}

function safeSetCookie(name, value) {
  try {
    document.cookie = name + "=" + encodeURIComponent(value) + "; path=/; max-age=31536000";
  } catch (e) { /* cookies unavailable: the URL still carries the date */ }
}

// "YYYY-MM-DD" -> Date at UTC midnight, or null if it isn't a real date.
// (The original code counted down to UTC midnight via Date.parse, so the
// same reading is kept here.)
function parseDateParam(value) {
  if (!value) return null;
  var d = new Date(value + "T00:00:00Z");
  return isNaN(d.getTime()) ? null : d;
}

function todayString(tz) {
  try {
    var fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz || undefined, year: "numeric", month: "2-digit", day: "2-digit" });
    return fmt.format(new Date());
  } catch (e) {
    return new Date().toISOString().substr(0, 10);
  }
}

// "HH:MM" (24-hour) or null. Anything else means "no time given" -> 00:00.
function parseTimeParam(value) {
  if (typeof value !== "string") return null;
  var m = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return m ? m[0] : null;
}

// --- timezones (plain Intl, no dependencies) ---
function localTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch (e) {
    return "UTC";
  }
}

function isValidTimeZone(tz) {
  if (typeof tz !== "string" || !tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch (e) {
    return false;
  }
}

// A stored or shared zone, or the browser's local zone when it is missing
// or not a real IANA name.
function resolveTimeZone(value) {
  return isValidTimeZone(value) ? value : localTimeZone();
}

// Offset of a zone at a UTC instant, in ms: how far the zone's wall clock
// sits ahead of UTC at that moment.
function tzOffsetMs(tz, utcMs) {
  var fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
  var parts = {};
  fmt.formatToParts(new Date(utcMs)).forEach(function(p) { parts[p.type] = p.value; });
  var asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - utcMs;
}

// "YYYY-MM-DD" + "HH:MM" wall time in a zone -> UTC milliseconds for that
// instant, or null if the date isn't real or the wall time doesn't exist
// (e.g. a time swallowed by a daylight-saving jump).
function wallTimeToUtcMs(dateStr, timeStr, tz) {
  if (!dateStr) return null;
  var parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  var y = parseInt(parts[0], 10), mo = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(mo) || isNaN(d)) return null;
  var t = parseTimeParam(timeStr) || "00:00";
  var hh = parseInt(t.substr(0, 2), 10), mm = parseInt(t.substr(3, 2), 10);
  var guess = Date.UTC(y, mo - 1, d, hh, mm);
  // Correct the guess by the zone offset, twice: the offset is always
  // subtracted from the original guess, and the second pass re-reads
  // the offset at the first estimate, which nails DST boundaries.
  // (Subtracting the second offset from the already-corrected value
  // instead would apply the offset twice.)
  var utc = guess - tzOffsetMs(tz, guess);
  utc = guess - tzOffsetMs(tz, utc);
  // Only accept it if the wall time in the zone round-trips exactly.
  var check = {};
  new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit"
  }).formatToParts(new Date(utc)).forEach(function(p) { check[p.type] = p.value; });
  if (+check.year !== y || +check.month !== mo || +check.day !== d || +check.hour !== hh || +check.minute !== mm) return null;
  return utc;
}

// --- the loading bar (issue #3):  •-----✈--------------❤ ---
// Pure function, so it can be tested on its own. Returns progress 0..1,
// or null when progress can't be shown (no start, or no journey to measure).
function computeProgress(startMs, targetMs, nowMs) {
  if (startMs == null || targetMs == null || isNaN(startMs) || isNaN(targetMs)) return null;
  // Check arrival first: a target of today has start == target, so the
  // non-positive-duration guard below must not hide the completed bar.
  if (nowMs >= targetMs) return 1;
  if (targetMs <= startMs) return null;
  if (nowMs <= startMs) return 0;
  return (nowMs - startMs) / (targetMs - startMs);
}

function updateProgressBar(nowMs) {
  var bar = document.getElementById("progress");
  var progress = (countDownDate && countDownStart)
    ? computeProgress(countDownStart.getTime(), countDownDate.getTime(), nowMs)
    : null;
  if (progress == null) {
    bar.style.display = "none";
    return;
  }
  bar.style.display = "block";
  // Floor, don't round: 100% / "Arrived!" is reserved for actual
  // completion (progress truly 1). Rounding would announce arrival
  // while the countdown is still running (99.5%+ shows as 100%).
  var pct = Math.floor(progress * 100);
  document.getElementById("progress-fill").style.width = pct + "%";
  document.getElementById("progress-plane").style.left = pct + "%";
  document.getElementById("progress-label").textContent =
    pct >= 100 ? "Arrived! ❤" : pct + "% of the way there";
}

function showCountdownTitle(dateField) {
  document.getElementById("countdown").style.display = "block";
  document.getElementById("title").innerHTML = "Time till " + dateField + " " + countDownTime + " :";
  var label = document.getElementById("tz-label");
  if (label) {
    label.textContent = "Target: " + dateField + " " + countDownTime + " (" + countDownTz + ")";
    label.style.display = "block";
  }
}

// Fill the timezone dropdown: the full IANA list when the browser can
// provide it, otherwise a short curated list of common zones. The
// currently-selected zone is always present, even if it isn't in the
// curated list.
var CURATED_TIMEZONES = [
  "UTC",
  "America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York",
  "America/Toronto", "America/Mexico_City", "America/Sao_Paulo",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Madrid", "Europe/Moscow",
  "Africa/Cairo", "Africa/Lagos",
  "Asia/Dubai", "Asia/Kolkata", "Asia/Dhaka", "Asia/Bangkok", "Asia/Singapore",
  "Asia/Shanghai", "Asia/Taipei", "Asia/Hong_Kong", "Asia/Tokyo", "Asia/Seoul",
  "Australia/Sydney", "Pacific/Auckland"
];

function populateTimeZoneSelect(select, selected) {
  var zones = null;
  try {
    if (typeof Intl.supportedValuesOf === "function") zones = Intl.supportedValuesOf("timeZone");
  } catch (e) { zones = null; }
  if (!zones || !zones.length) zones = CURATED_TIMEZONES.slice();
  if (zones.indexOf(selected) === -1) zones = [selected].concat(zones);
  select.innerHTML = "";
  zones.forEach(function(z) {
    var opt = document.createElement("option");
    opt.value = z;
    opt.textContent = z;
    select.appendChild(opt);
  });
  select.value = selected;
}

function setCountDownTime() {
  // Try the URL query first, then cookies.
  var urlParams = new URLSearchParams(window.location.search);
  var dateField = urlParams.get("countdowndate");
  var timeField = urlParams.get("time");
  var startField = urlParams.get("start");
  var tzField = urlParams.get("tz");
  // Cookies are a set, and only for a saved timer with no URL target:
  // a shared link without ?start= must not borrow the start of whatever
  // timer this browser saved, or the same link shows different progress
  // to different people. A URL target without a start keeps its start
  // unknown (bar hidden) instead.
  if (dateField == null) {
    dateField = safeGetCookie("countDownDate");
    timeField = safeGetCookie("countDownTime");
    startField = safeGetCookie("countDownStart");
    tzField = safeGetCookie("countDownTz");
  }
  // The zone is needed before the start backfill below (today is
  // measured in the timer's zone).
  countDownTz = resolveTimeZone(tzField);
  // A saved timer from before the loading bar existed has a target
  // but no start, so the bar would never show for it. Give it a
  // start of today (in the timer's zone) and save it, so the bar
  // appears without having to re-pick the date. This only runs for
  // a saved timer: a shared link without ?start= keeps its start
  // unknown, so one person's saved start never leaks into someone
  // else's link.
  if (urlParams.get("countdowndate") == null &&
      parseDateParam(dateField) != null && parseDateParam(startField) == null) {
    startField = todayString(countDownTz);
    safeSetCookie("countDownStart", startField);
    try {
      var url = new URL(window.location.href);
      url.searchParams.set("start", startField);
      window.history.replaceState(null, "", url.toString());
    } catch (err) { /* URL can't be updated (e.g. file://): the cookie still holds it */ }
  }

  var today = todayString(countDownTz);
  document.querySelector("#countdowndate").value = today;
  document.getElementById("countdowndate").setAttribute("min", today);

  // No time given (old timer, old link) means midnight, as before.
  countDownTime = parseTimeParam(timeField) || "00:00";
  document.querySelector("#countdowntime").value = countDownTime;
  populateTimeZoneSelect(document.querySelector("#timezone"), countDownTz);

  var targetMs = wallTimeToUtcMs(dateField, countDownTime, countDownTz);
  countDownDate = targetMs == null ? null : new Date(targetMs);
  // The start is a date; its instant is midnight at the start of that
  // day in the timer's zone.
  var startMs = wallTimeToUtcMs(startField, "00:00", countDownTz);
  countDownStart = startMs == null ? null : new Date(startMs);

  if (countDownDate) {
    showCountdownTitle(dateField);
  } else {
    document.getElementById("title").innerHTML = "Click the setting icon on the top right to get started";
    document.getElementById("countdown").style.display = "none";
    document.getElementById("progress").style.display = "none";
    var tzLabel = document.getElementById("tz-label");
    if (tzLabel) tzLabel.style.display = "none";
  }
}

function model() {
  // Get the modal
  var modal = document.getElementById("settingModal");

  // Get the button that opens the modal
  var btn = document.getElementById("setting");

  // Get the <span> element that closes the modal
  var span = document.getElementsByClassName("close")[0];

  // When the user clicks on the button, open the modal
  btn.onclick = function() {
    modal.style.display = "block";
  };

  // Keyboard: the gear is a div, so Enter/Space must open it too.
  btn.onkeydown = function(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      modal.style.display = "block";
    }
  };

  // When the user clicks on <span> (x), close the modal
  span.onclick = function() {
    modal.style.display = "none";
  };

  // Saving a date used to rely on `submit.onSubmit`, which never fires
  // (buttons have no submit event), so the cookie was never saved and the
  // page only worked by accident via a form reload. Handle the form's
  // submit properly instead: save target + time + zone + start, update
  // the URL so the link stays shareable, and refresh the page in place.
  document.getElementById("settingForm").addEventListener("submit", function(e) {
    e.preventDefault();
    var value = document.getElementById("countdowndate").value;
    var timeValue = parseTimeParam(document.getElementById("countdowntime").value) || "00:00";
    var tzValue = resolveTimeZone(document.getElementById("timezone").value);
    var targetMs = wallTimeToUtcMs(value, timeValue, tzValue);
    if (targetMs == null) return;
    var start = todayString(tzValue);
    countDownDate = new Date(targetMs);
    countDownTime = timeValue;
    countDownTz = tzValue;
    countDownStart = new Date(wallTimeToUtcMs(start, "00:00", tzValue));
    safeSetCookie("countDownDate", value);
    safeSetCookie("countDownTime", timeValue);
    safeSetCookie("countDownTz", tzValue);
    safeSetCookie("countDownStart", start);
    try {
      var url = new URL(window.location.href);
      url.searchParams.set("countdowndate", value);
      url.searchParams.set("time", timeValue);
      url.searchParams.set("tz", tzValue);
      url.searchParams.set("start", start);
      window.history.replaceState(null, "", url.toString());
    } catch (err) { /* URL can't be updated (e.g. file://): cookies still hold it */ }
    showCountdownTitle(value);
    updateProgressBar(Date.now());
    modal.style.display = "none";
  });

  // When the user clicks anywhere outside of the modal, close it
  window.onclick = function(event) {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  };
}

setCountDownTime();
model();

// Update the count down every 1 second
var x = setInterval(function() {
    // Get todays date and time
    var today = new Date();
    var now = today.getTime();

    if (countDownDate) {
        // Find the distance between now and the count down date
        var distance = countDownDate.getTime() - now;

        // Time calculations for days, hours, minutes and seconds
        var days = Math.floor(distance / (1000 * 60 * 60 * 24));
        var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        hours = ("0" + hours).slice(-2);
        var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        minutes = ("0" + minutes).slice(-2);
        var seconds = Math.floor((distance % (1000 * 60)) / 1000);
        seconds = ("0" + seconds).slice(-2);

        // Output the result in an element with id="countdown"
        if (days == 1) {
            document.getElementById("countdown").innerHTML = days + " Day<br>" + hours + ":" + minutes + ":" + seconds;
        } else {
            document.getElementById("countdown").innerHTML = days + " Days<br>" + hours + ":" + minutes + ":" + seconds;
        }

        updateProgressBar(now);

        // If the count down is over, write some text
        if (distance < -864000000) {
            document.getElementById("countdown").innerHTML = "Time to plan for next trip!";
        } else if (distance < 0) {
            document.getElementById("countdown").innerHTML = "Happy Reunion!";
        }
    }

    var h = today.getHours();
    var m = today.getMinutes();
    document.getElementById("clock").innerHTML = ("0" + h).slice(-2) + ":" + ("0" + m).slice(-2);
    document.getElementById("date").innerHTML = today.toDateString();

    if (h == 5) {
        document.body.className = "night-to-day";
        // magic number to fade the sky colour
        var r = Math.round(44 + 3.52 * parseInt(m));
        var g = Math.round(71 + 3.07 * parseInt(m));
        var b = Math.round(86 + 2.82 * parseInt(m));
        document.body.style.backgroundColor = 'rgb(' + r + ',' + g + ',' + b + ')';
    } else if (h > 5 && h < 16) {
        document.body.className = "day";
    } else if (h == 16) {
        document.body.className = "day-to-dawn";
        // fade to dawn
        var r = 255;
        var g = Math.round(255 - 0.53 * parseInt(m));
        var b = Math.round(255 - 2.03 * parseInt(m));
        document.body.style.backgroundColor = 'rgb(' + r + ',' + g + ',' + b + ')';
    } else if (h == 17) {
        document.body.className = "dawn";
    } else if (h == 18) {
        document.body.className = "dawn-to-night";
        // fade to night
        var r = Math.round(255 - 3.52 * parseInt(m));
        var g = Math.round(223 - 2.53 * parseInt(m));
        var b = Math.round(133 - 0.78 * parseInt(m));
        document.body.style.backgroundColor = 'rgb(' + r + ',' + g + ',' + b + ')';
    } else {
        document.body.className = "night";
    }
}, 1000);
