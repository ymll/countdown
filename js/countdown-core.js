/* Pure countdown helpers shared by the browser app and Node tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CountdownCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function progressBetween(start, target, now) {
    if (![start, target, now].every(Number.isFinite)) return null;
    if (now >= target) return 1;
    if (target <= start) return null;
    if (now <= start) return 0;
    return Math.max(0, Math.min(1, (now - start) / (target - start)));
  }

  function formatRemaining(target, now) {
    if (!Number.isFinite(target) || !Number.isFinite(now)) return null;
    const seconds = Math.floor(Math.abs(target - now) / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return target <= now
      ? { days: 0, hours: 0, minutes: 0, seconds: 0, arrived: true }
      : { days, hours, minutes, seconds: secs, arrived: false };
  }

  function cleanName(value) {
    return String(value || "").trim().slice(0, 80);
  }

  function createTimer({ name, target, id, createdAt }) {
    const clean = cleanName(name);
    const targetMs = typeof target === "number" ? target : Date.parse(target);
    if (!clean) throw new Error("Give your countdown a name.");
    if (!Number.isFinite(targetMs) || !Number.isFinite(new Date(targetMs).getTime())) throw new Error("Choose a valid date and time.");
    const createdMs = createdAt == null ? Date.now() : (typeof createdAt === "number" ? createdAt : Date.parse(createdAt));
    const safeCreatedAt = Number.isFinite(createdMs) && createdMs < targetMs ? new Date(createdMs).toISOString() : new Date().toISOString();
    return {
      id: id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2)),
      name: clean,
      target: new Date(targetMs).toISOString(),
      createdAt: safeCreatedAt
    };
  }

  return { progressBetween, formatRemaining, cleanName, createTimer };
});
