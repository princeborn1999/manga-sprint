import { describe, expect, it } from "vitest";
import type { Chapter } from "../../src/shared/types";
import { cumulativePages, differencePages, paceStatus, percent } from "../../src/shared/calculations";

const now = "2026-07-27T00:00:00.000Z";
const chapters: Chapter[] = [
  { id:"7",chapterNumber:7,title:"Ch7",totalPages:18,startDate:"2026-07-27",targetEndDate:"2026-07-27",actualCompletedPages:12,status:"in-progress",createdAt:now,updatedAt:now,order:0 },
  { id:"8",chapterNumber:8,title:"Ch8",totalPages:18,startDate:"2026-07-28",targetEndDate:"2026-07-28",actualCompletedPages:16,status:"in-progress",createdAt:now,updatedAt:now,order:1 },
];

describe("progress calculations", () => {
  it("calculates cumulative pages across chapters", () => expect(cumulativePages(chapters,{chapterNumber:8,page:16})).toBe(34));
  it("matches the requested 22-page example", () => expect(cumulativePages(chapters,{chapterNumber:8,page:16})-cumulativePages(chapters,{chapterNumber:7,page:12})).toBe(22));
  it("calculates ahead, behind and on-track", () => {
    expect(differencePages(18,16)).toBe(2);
    expect(paceStatus(-1)).toBe("behind");
    expect(paceStatus(0)).toBe("on-track");
    expect(paceStatus(2)).toBe("ahead");
  });
  it("rounds percentages", () => {
    expect(percent(16,18)).toBe(89);
    expect(percent(12,18)).toBe(67);
    expect(percent(18,18)).toBe(100);
  });
});
