import { describe, expect, it } from "vitest";
import {
  daysInclusive,
  isValidLocalDate,
  localDate,
} from "../../src/shared/date";

describe("local date", () => {
  it("does not use UTC date splitting", () =>
    expect(localDate(new Date(2026, 6, 27, 0, 5))).toBe("2026-07-27"));
  it("validates real calendar dates", () => {
    expect(isValidLocalDate("2026-02-29")).toBe(false);
    expect(isValidLocalDate("2028-02-29")).toBe(true);
  });
  it("counts an inclusive schedule", () =>
    expect(daysInclusive("2026-07-27", "2026-07-29")).toBe(3));
});
