import { describe, expect, it } from "vitest";
import { combinePlatformContent, DEFAULT_TEMPLATES, generatePlatformPost, renderTemplate } from "../../src/shared/post-studio/templates";
import type { PostProject } from "../../src/shared/post-studio/types";

const project: PostProject = {
  id:"p1",workTitle:"葛瑞拉之怒",englishWorkTitle:"RAGE GORILLA",chapterNumber:18,chapterTitle:"",englishChapterTitle:"",postType:"new-chapter",shortHighlight:"The battle begins.",readingUrl:"https://example.com/18",publishDate:"2026-08-03",note:"",images:[],createdAt:"x",updatedAt:"x",
  platforms: {
    x:{platform:"x",enabled:true,imageIds:[],title:"",content:"",tags:"",status:"not-prepared",dirty:false},
    instagram:{platform:"instagram",enabled:true,imageIds:[],title:"",content:"",tags:"",status:"not-prepared",dirty:false},
    pixiv:{platform:"pixiv",enabled:true,imageIds:[],title:"",content:"",tags:"",status:"not-prepared",dirty:false},
    mangaPlus:{platform:"mangaPlus",enabled:true,imageIds:[],title:"",content:"",tags:"",status:"not-prepared",dirty:false},
  },
};

describe("Post Studio templates", () => {
  it("replaces variables and removes blank or unknown placeholders", () => expect(renderTemplate("{{englishWorkTitle}} CH {{chapterNumber}}\n{{chapterTitle}}\n{{unknown}}", project)).toBe("RAGE GORILLA CH 18"));
  it("generates independent platform defaults", () => {
    const x=generatePlatformPost(project,"x",DEFAULT_TEMPLATES.x), instagram=generatePlatformPost(project,"instagram",DEFAULT_TEMPLATES.instagram);
    expect(x.content).toContain("https://example.com/18"); expect(instagram.content).toContain("link in bio"); expect(instagram.content).not.toContain("https://example.com/18");
  });
  it("clears dirty state after explicit regeneration", () => { const edited=structuredClone(project); edited.platforms.x.dirty=true; expect(generatePlatformPost(edited,"x",DEFAULT_TEMPLATES.x).dirty).toBe(false); });
  it("combines Pixiv fields for one-click copy", () => { const value=combinePlatformContent("pixiv",generatePlatformPost(project,"pixiv",DEFAULT_TEMPLATES.pixiv)); expect(value).toContain("Title:\nRAGE GORILLA — Chapter 18"); expect(value).toContain("Tags:\nOriginal"); });
  it("leaves over-limit X text intact for the UI warning", () => { const long=structuredClone(project); long.shortHighlight="x".repeat(300); const value=combinePlatformContent("x",generatePlatformPost(long,"x",DEFAULT_TEMPLATES.x)); expect(value.length).toBeGreaterThan(280); expect(value).toContain("x".repeat(300)); });
});

