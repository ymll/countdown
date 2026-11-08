// Personalised Countdown Timer
//
// The target date comes from, in order: the ?countdowndate= URL param,
// the countDownDate cookie, or nothing (then the page asks you to pick one).
// The loading bar (issue #3) also needs a start date: the day the target
// was picked. It travels with the target as ?start= in the URL and in the
// countDownStart cookie, so a shared link keeps its progress. A saved timer
// from before the bar existed has no start, so on load it is given a start
// of today (and saved) instead of hiding the bar forever.

// Target and start as Date objects, or null until they are known.
var countDownDate = null;
var countDownStart = null;

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

function todayString() {
  return new Date().toISOString().substr(0, 10);
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
  document.getElementById("title").innerHTML = "Time till " + dateField + " :";
}

function setCountDownTime() {
  // Try the URL query first, then cookies.
  var urlParams = new URLSearchParams(window.location.search);
  var dateField = urlParams.get("countdowndate");
  var startField = urlParams.get("start");
  // Cookies are a pair, and only for a saved timer with no URL target:
  // a shared link without ?start= must not borrow the start of whatever
  // timer this browser saved, or the same link shows different progress
  // to different people. A URL target without a start keeps its start
  // unknown (bar hidden) instead.
  if (dateField == null) {
    dateField = safeGetCookie("countDownDate");
    startField = safeGetCookie("countDownStart");
    // A saved timer from before the loading bar existed has a target
    // but no start, so the bar would never show for it. Give it a
    // start of today and save it, so the bar appears without having
    // to re-pick the date. (A shared link without ?start= still keeps
    // its start unknown — see below — so one person's saved start
    // never leaks into someone else's link.)
    if (parseDateParam(dateField) != null && parseDateParam(startField) == null) {
      startField = todayString();
      safeSetCookie("countDownStart", startField);
      try {
        var url = new URL(window.location.href);
        url.searchParams.set("start", startField);
        window.history.replaceState(null, "", url.toString());
      } catch (err) { /* URL can't be updated (e.g. file://): the cookie still holds it */ }
    }
  }

  var today = todayString();
  document.querySelector("#countdowndate").value = today;
  document.getElementById("countdowndate").setAttribute("min", today);

  countDownDate = parseDateParam(dateField);
  countDownStart = parseDateParam(startField);

  if (countDownDate) {
    showCountdownTitle(dateField);
  } else {
    document.getElementById("title").innerHTML = "Click the setting icon on the top right to get started";
    document.getElementById("countdown").style.display = "none";
    document.getElementById("progress").style.display = "none";
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
  // submit properly instead: save target + start, update the URL so the
  // link stays shareable, and refresh the page in place.
  document.getElementById("settingForm").addEventListener("submit", function(e) {
    e.preventDefault();
    var value = document.getElementById("countdowndate").value;
    var target = parseDateParam(value);
    if (!target) return;
    var start = todayString();
    countDownDate = target;
    countDownStart = parseDateParam(start);
    safeSetCookie("countDownDate", value);
    safeSetCookie("countDownStart", start);
    try {
      var url = new URL(window.location.href);
      url.searchParams.set("countdowndate", value);
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
