/* Countdown — a small place to keep the dates you're looking forward to. */
(function () {
  "use strict";
  const Core = window.CountdownCore;
  const STORAGE_KEY = "countdown.timers.v2";
  const $ = (id) => document.getElementById(id);
  const state = { timers: [], activeId: null, now: Date.now() };

  function readTimers() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(value) ? value.filter(validTimer) : [];
    } catch (_) { return []; }
  }
  function validTimer(timer) {
    return timer && typeof timer.id === "string" && typeof timer.name === "string" &&
      Number.isFinite(Date.parse(timer.target));
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.timers)); }
    catch (_) { announce("This browser couldn't save your countdowns. You can still share a link."); }
  }
  function announce(message) {
    $("notice").textContent = message;
    $("notice").classList.add("visible");
    window.clearTimeout(announce.timeout);
    announce.timeout = window.setTimeout(() => $("notice").classList.remove("visible"), 3200);
  }
  function activeTimer() { return state.timers.find(t => t.id === state.activeId) || null; }
  function setActive(id) {
    state.activeId = id;
    render();
  }
  function importLink() {
    const params = new URLSearchParams(location.search);
    const at = params.get("at");
    if (at) {
      try {
        const timer = Core.createTimer({ name: params.get("name") || "A date to look forward to", target: at });
        state.timers = [timer, ...state.timers.filter(t => t.target !== timer.target || t.name !== timer.name)];
        state.activeId = timer.id;
        save();
        return;
      } catch (_) {}
    }
    // Keep links made by the original 2017 app working.
    const legacyDate = params.get("countdowndate");
    if (legacyDate && /^\d{4}-\d{2}-\d{2}$/.test(legacyDate)) {
      const timer = Core.createTimer({ name: "Next reunion", target: legacyDate + "T00:00:00Z" });
      state.timers = [timer, ...state.timers.filter(t => t.target !== timer.target)];
      state.activeId = timer.id;
      save();
    }
  }
  function renderMain() {
    const timer = activeTimer();
    const empty = !timer;
    $("empty-state").hidden = !empty;
    $("timer-view").hidden = empty;
    if (empty) return;
    const target = Date.parse(timer.target);
    const remaining = Core.formatRemaining(target, state.now);
    $("active-name").textContent = timer.name;
    $("target-date").textContent = new Intl.DateTimeFormat(undefined, {
      dateStyle: "full", timeStyle: "short"
    }).format(new Date(target));
    $("count-days").textContent = remaining.days.toLocaleString();
    $("count-hours").textContent = String(remaining.hours).padStart(2, "0");
    $("count-minutes").textContent = String(remaining.minutes).padStart(2, "0");
    $("count-seconds").textContent = String(remaining.seconds).padStart(2, "0");
    const progress = Core.progressBetween(Date.parse(timer.createdAt), target, state.now);
    const pct = progress === null ? 100 : Math.floor(progress * 100);
    $("progress-fill").style.width = pct + "%";
    $("progress-plane").style.left = pct + "%";
    $("progress-label").textContent = remaining.arrived ? "The day is here ♥" :
      (progress === null ? "Your countdown is ready" : pct + "% of the journey");
    $("status-message").textContent = remaining.arrived
      ? "Today is the day. Make it a good one."
      : remaining.days > 30 ? "Something lovely is on the horizon." : "It's getting closer!";
    $("share-button").disabled = false;
  }
  function renderList() {
    const list = $("countdown-list");
    list.replaceChildren();
    state.timers.forEach(timer => {
      const item = document.createElement("li");
      item.className = "countdown-item" + (timer.id === state.activeId ? " active" : "");
      const select = document.createElement("button");
      select.className = "countdown-select";
      select.type = "button";
      select.setAttribute("aria-pressed", String(timer.id === state.activeId));
      const name = document.createElement("span");
      name.className = "item-name";
      name.textContent = timer.name;
      const date = document.createElement("span");
      date.className = "item-date";
      date.textContent = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(timer.target));
      select.append(name, date);
      select.addEventListener("click", () => setActive(timer.id));
      const remove = document.createElement("button");
      remove.className = "remove-button";
      remove.type = "button";
      remove.setAttribute("aria-label", "Delete " + timer.name);
      remove.textContent = "×";
      remove.addEventListener("click", () => {
        state.timers = state.timers.filter(t => t.id !== timer.id);
        if (state.activeId === timer.id) state.activeId = state.timers[0]?.id || null;
        save(); render();
      });
      item.append(select, remove);
      list.append(item);
    });
    $("timer-count").textContent = state.timers.length + (state.timers.length === 1 ? " saved date" : " saved dates");
  }
  function render() { renderList(); renderMain(); }
  function openDialog() {
    $("timer-dialog").showModal();
    $("timer-name").focus();
  }
  $("add-button").addEventListener("click", openDialog);
  $("empty-add").addEventListener("click", openDialog);
  $("timer-form").addEventListener("submit", event => {
    event.preventDefault();
    const value = $("timer-date").value;
    if (!value) return;
    try {
      const timer = Core.createTimer({ name: $("timer-name").value, target: new Date(value).getTime() });
      state.timers.unshift(timer);
      state.activeId = timer.id;
      save();
      $("timer-dialog").close();
      $("timer-form").reset();
      render();
      announce("Your countdown is ready.");
    } catch (error) { announce(error.message); }
  });
  $("cancel-button").addEventListener("click", () => $("timer-dialog").close());
  $("cancel-button-secondary").addEventListener("click", () => $("timer-dialog").close());
  $("share-button").addEventListener("click", async () => {
    const timer = activeTimer();
    if (!timer) return;
    const url = new URL(location.href);
    url.search = "";
    url.searchParams.set("at", timer.target);
    url.searchParams.set("name", timer.name);
    try {
      if (navigator.share) await navigator.share({ title: timer.name + " — Countdown", url: url.toString() });
      else {
        await navigator.clipboard.writeText(url.toString());
        announce("Share link copied.");
      }
    } catch (error) {
      if (error.name !== "AbortError") announce("Couldn't share this link. Try copying the page address.");
    }
  });

  state.timers = readTimers();
  importLink();
  state.activeId = state.activeId || state.timers[0]?.id || null;
  // Backfill start dates for older locally saved timers.
  state.timers.forEach(timer => { if (!timer.createdAt || !Number.isFinite(Date.parse(timer.createdAt))) timer.createdAt = new Date().toISOString(); });
  save();
  render();
  window.setInterval(() => { state.now = Date.now(); renderMain(); }, 1000);
})();
