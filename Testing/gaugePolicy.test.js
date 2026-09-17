import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateGaugeDatePolicy,
  getIndiaCalendarDate,
} from "../services/gaugePolicy.js";

const check = (targetDate, today, operation = "create", isAdmin = false) =>
  evaluateGaugeDatePolicy({ targetDate, today, operation, isAdmin });

test("first-half entries remain open on the 17th and lock on the 18th", () => {
  assert.equal(check("2026-07-01", "2026-07-17").allowed, true);
  assert.equal(check("2026-07-15", "2026-07-18").code, "FIRST_HALF_LOCKED");
  assert.equal(check("2026-07-16", "2026-07-18").allowed, true);
});

test("previous month's 16th-onward remains open through the 2nd and locks on the 3rd", () => {
  assert.equal(check("2026-06-16", "2026-07-02").allowed, true);
  assert.equal(
    check("2026-06-30", "2026-07-03").code,
    "PREVIOUS_MONTH_LOCKED",
  );
  assert.equal(check("2025-12-16", "2026-01-02").allowed, true);
});

test("previous month's 1st-15th stays locked even during the next month's grace period", () => {
  assert.equal(check("2026-06-01", "2026-07-02").code, "FIRST_HALF_LOCKED");
  assert.equal(check("2026-06-15", "2026-07-01").code, "FIRST_HALF_LOCKED");
});

test("edit and delete use a calendar-day age without timestamps", () => {
  assert.equal(check("2026-07-16", "2026-07-31", "update").allowed, true);
  assert.equal(
    check("2026-07-15", "2026-07-31", "delete").code,
    "FIRST_HALF_LOCKED",
  );
  assert.equal(
    check("2026-07-01", "2026-07-17", "delete").code,
    "OLDER_THAN_15_DAYS",
  );
  assert.equal(
    check("2026-06-15", "2026-07-01", "delete").code,
    "FIRST_HALF_LOCKED",
  );
});

test("admins bypass historical cutoffs but not future dates", () => {
  assert.equal(check("2025-01-01", "2026-07-18", "update", true).allowed, true);
  assert.equal(
    check("2026-07-19", "2026-07-18", "create", true).code,
    "FUTURE_DATE",
  );
});

test("India calendar date ignores the host timezone", () => {
  assert.deepEqual(
    getIndiaCalendarDate(new Date("2026-07-17T18:30:00.000Z")),
    { year: 2026, month: 7, day: 18, iso: "2026-07-18" },
  );
});
