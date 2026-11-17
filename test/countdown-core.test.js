const test = require("node:test");
const assert = require("node:assert/strict");
const { progressBetween, formatRemaining, cleanName, createTimer } = require("../js/countdown-core.js");

test("progress is clamped and only reaches 100% at arrival", () => {
  assert.equal(progressBetween(0, 100, -10), 0);
  assert.equal(progressBetween(0, 100, 50), 0.5);
  assert.equal(progressBetween(0, 100, 99), 0.99);
  assert.equal(progressBetween(0, 100, 100), 1);
  assert.equal(progressBetween(0, 100, 101), 1);
});
test("progress rejects an invalid or zero-length journey before arrival", () => {
  assert.equal(progressBetween(0, 0, -1), null);
  assert.equal(progressBetween(10, 5, 4), null);
  assert.equal(progressBetween(NaN, 5, 4), null);
});
test("remaining time handles future and elapsed targets", () => {
  assert.deepEqual(formatRemaining(90061000, 0), { days: 1, hours: 1, minutes: 1, seconds: 1, arrived: false });
  assert.equal(formatRemaining(0, 1).arrived, true);
});
test("names are trimmed and bounded", () => {
  assert.equal(cleanName("  Reunion!  "), "Reunion!");
  assert.equal(cleanName("x".repeat(100)).length, 80);
});
test("timer creation validates required fields and normalizes the instant", () => {
  assert.throws(() => createTimer({ name: " ", target: 100 }), /name/);
  assert.throws(() => createTimer({ name: "Trip", target: "not a date" }), /date/);
  const timer = createTimer({ name: "Trip", target: "2027-01-01T00:00:00Z", id: "test-id", createdAt: "2026-01-01T00:00:00Z" });
  assert.equal(timer.id, "test-id");
  assert.equal(timer.target, "2027-01-01T00:00:00.000Z");
});
