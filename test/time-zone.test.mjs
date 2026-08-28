import test from "node:test";
import assert from "node:assert/strict";
import {
  buildUserTimeContext, formatTimestampForUser, formatUserTimestamps, normalizeUserTimeZone,
} from "../time-zone.mjs";

test("normalizes supported IANA time zones and rejects invalid values", () => {
  assert.equal(normalizeUserTimeZone("Europe/London"), "Europe/London");
  assert.equal(normalizeUserTimeZone("not/a-zone"), "UTC");
  assert.equal(normalizeUserTimeZone("x".repeat(101)), "UTC");
});

test("formats UTC telemetry in the user's zone with the date-specific offset", () => {
  const summer = formatTimestampForUser("2026-08-28 11:25:03", "Europe/London");
  const winter = formatTimestampForUser("2026-01-28T11:25:03Z", "Europe/London");

  assert.match(summer.local, /28 Aug 2026, 12:25:03/);
  assert.match(summer.local, /UTC\+01:00 · Europe\/London/);
  assert.match(winter.local, /28 Jan 2026, 11:25:03/);
  assert.match(winter.local, /UTC\+00:00 · Europe\/London/);
});

test("builds a validated user-time marker and converts a bounded timestamp list", () => {
  const context = buildUserTimeContext("Europe/London", new Date("2026-08-28T11:28:00Z"));
  const converted = JSON.parse(formatUserTimestamps(
    JSON.stringify({ timestamps: ["2026-08-28T11:25:03Z"] }),
    context.timeZone,
  ));

  assert.match(context.marker, /USER_TIME_ZONE: Europe\/London/);
  assert.match(context.marker, /UTC\+01:00/);
  assert.equal(converted.timeZone, "Europe/London");
  assert.match(converted.timestamps[0].local, /12:25:03/);
});
