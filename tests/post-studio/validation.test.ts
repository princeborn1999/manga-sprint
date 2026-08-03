import { describe, expect, it } from "vitest";
import { DEFAULT_PLATFORM_URLS, DEFAULT_TEMPLATES } from "../../src/shared/post-studio/templates";
import { safePostStudioState } from "../../src/shared/post-studio/validation";

const fallback = { version:1,projects:[],templates:DEFAULT_TEMPLATES,platformUrls:DEFAULT_PLATFORM_URLS };
describe("Post Studio state migration", () => {
  it("falls back safely for corrupt data", () => expect(safePostStudioState(null,fallback)).toEqual(fallback));
  it("drops malformed projects without preventing startup", () => { const state=safePostStudioState({version:0,projects:[{id:"bad"}],templates:{},platformUrls:{}},fallback); expect(state.version).toBe(1); expect(state.projects).toEqual([]); expect(state.templates.x).toEqual(DEFAULT_TEMPLATES.x); });
});
