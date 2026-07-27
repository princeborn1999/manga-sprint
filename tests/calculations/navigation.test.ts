import { describe, expect, it } from "vitest";
import type { Chapter } from "../../src/shared/types";
import { moveProgress } from "../../src/renderer/hooks/useProgress";

const base = { title:"x",startDate:"2026-07-27",targetEndDate:"2026-07-27",status:"in-progress" as const,createdAt:"x",updatedAt:"x" };
describe("one-page controls", () => {
  it("moves +1 inside a chapter", () => {
    const chapters: Chapter[]=[{...base,id:"1",chapterNumber:1,totalPages:18,actualCompletedPages:12,order:0}];
    expect(moveProgress(chapters,1)).toEqual({chapterNumber:1,page:13});
  });
  it("moves from a completed chapter into next chapter page 1", () => {
    const chapters: Chapter[]=[{...base,id:"1",chapterNumber:1,totalPages:18,actualCompletedPages:18,order:0,status:"completed"},{...base,id:"2",chapterNumber:2,totalPages:20,actualCompletedPages:0,order:1,status:"not-started"}];
    expect(moveProgress(chapters,1)).toEqual({chapterNumber:2,page:1});
  });
  it("never produces a negative page", () => {
    const chapters: Chapter[]=[{...base,id:"1",chapterNumber:1,totalPages:18,actualCompletedPages:0,order:0,status:"not-started"}];
    expect(moveProgress(chapters,-1)).toBeUndefined();
  });
});
