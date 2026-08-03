import { useEffect, useMemo, useState } from "react";
import { combinePlatformContent, DEFAULT_TEMPLATES, generatePlatformPost, PLATFORM_LABELS, PLATFORM_TYPES, renderTemplate, TEMPLATE_VARIABLES } from "../../shared/post-studio/templates";
import type { PlatformPost, PlatformStatus, PlatformType, PostProject, PostTemplate } from "../../shared/post-studio/types";
import { usePostStudioStore } from "../stores/postStudio";

const STATUS_LABELS: Record<PlatformStatus, string> = { "not-prepared": "Not prepared", ready: "Ready", published: "Published", skipped: "Skipped", failed: "Failed" };

function ProjectList() {
  const { state, selected, newProject, select, duplicate, remove } = usePostStudioStore();
  const [search, setSearch] = useState("");
  const projects = (state?.projects ?? []).filter((project) => `${project.workTitle} ${project.chapterNumber} ${project.postType}`.toLowerCase().includes(search.toLowerCase()));
  return <aside className="post-sidebar">
    <div className="brand"><small>MANGASPRINT</small><strong>Post Studio</strong></div>
    <button className="primary" onClick={() => void newProject()}>＋ New Post Project</button>
    <input className="search" placeholder="Search chapter or work…" value={search} onChange={(event) => setSearch(event.target.value)} />
    <div className="project-list">{projects.map((project) => <button key={project.id} className={`project-item ${selected?.id === project.id ? "active" : ""}`} onClick={() => void select(project.id)}>
      <span>CH {project.chapterNumber}</span><strong>{project.englishWorkTitle}</strong><small>{new Date(project.updatedAt).toLocaleDateString()}</small>
      <i>{PLATFORM_TYPES.map((platform) => project.platforms[platform].status === "published" ? "●" : "○").join(" ")}</i>
    </button>)}</div>
    {selected && state?.projects.some((item) => item.id === selected.id) && <div className="sidebar-actions"><button onClick={() => void duplicate(selected.id)}>Duplicate</button><button className="danger" onClick={() => { if (confirm("確定刪除這筆發文專案？")) void remove(selected.id); }}>Delete</button></div>}
  </aside>;
}

function ProjectForm({ project, onChange }: { project: PostProject; onChange: (project: PostProject) => void }) {
  const patch = (value: Partial<PostProject>) => onChange({ ...project, ...value });
  return <section className="post-card project-form"><h2>Project details</h2><div className="form-grid">
    <label>作品名稱<input value={project.workTitle} onChange={(e) => patch({ workTitle: e.target.value })} /></label>
    <label>English title<input value={project.englishWorkTitle} onChange={(e) => patch({ englishWorkTitle: e.target.value })} /></label>
    <label>Chapter<input type="number" min="0" value={project.chapterNumber} onChange={(e) => patch({ chapterNumber: Number(e.target.value) })} /></label>
    <label>Post type<select value={project.postType} onChange={(e) => patch({ postType: e.target.value as PostProject["postType"] })}><option value="new-chapter">New Chapter</option><option value="drawing-progress">Drawing Progress</option><option value="character-introduction">Character Introduction</option><option value="manga-panel">Manga Panel</option><option value="announcement">Announcement</option><option value="custom">Custom</option></select></label>
    <label>中文章節標題<input value={project.chapterTitle} onChange={(e) => patch({ chapterTitle: e.target.value })} /></label>
    <label>English chapter title<input value={project.englishChapterTitle} onChange={(e) => patch({ englishChapterTitle: e.target.value })} /></label>
    <label className="wide">Short highlight<textarea value={project.shortHighlight} onChange={(e) => patch({ shortHighlight: e.target.value })} /></label>
    <label>Reading URL<input value={project.readingUrl} onChange={(e) => patch({ readingUrl: e.target.value })} /></label>
    <label>Publish date<input type="date" value={project.publishDate} onChange={(e) => patch({ publishDate: e.target.value })} /></label>
    <label className="wide">Notes<textarea value={project.note} onChange={(e) => patch({ note: e.target.value })} /></label>
  </div></section>;
}

function ImageLibrary({ project, onChange }: { project: PostProject; onChange: (project: PostProject) => void }) {
  const { addImages, previews } = usePostStudioStore();
  const remove = (id: string) => { const platforms = { ...project.platforms }; for (const p of PLATFORM_TYPES) platforms[p] = { ...platforms[p], imageIds: platforms[p].imageIds.filter((value) => value !== id) }; onChange({ ...project, images: project.images.filter((image) => image.id !== id), platforms }); };
  const move = (index: number, delta: -1 | 1) => { const next=index+delta; if(next<0||next>=project.images.length)return; const images=[...project.images]; [images[index],images[next]]=[images[next],images[index]]; onChange({...project,images}); };
  return <section className="post-card"><div className="section-title"><div><h2>Image library</h2><p>Original files stay in their current folders.</p></div><button onClick={() => void addImages()}>＋ Add images</button></div>
    {!project.images.length ? <div className="empty-box">No images selected</div> : <div className="image-grid">{project.images.map((image, index) => <div className={`image-tile ${image.missing ? "missing" : ""}`} key={image.id}>{previews[image.id] ? <img src={previews[image.id]} /> : <div className="missing-label">Missing</div>}<span>{index + 1}. {image.fileName}</span><button className="remove-image" onClick={() => remove(image.id)}>×</button><div className="image-order"><button disabled={index===0} onClick={()=>move(index,-1)}>←</button><button disabled={index===project.images.length-1} onClick={()=>move(index,1)}>→</button></div></div>)}</div>}
  </section>;
}

function PlatformEditor({ project, platform, onChange }: { project: PostProject; platform: PlatformType; onChange: (project: PostProject) => void }) {
  const { copy, openPlatform } = usePostStudioStore(); const post = project.platforms[platform];
  const patch = (value: Partial<PlatformPost>, dirty = true) => onChange({ ...project, platforms: { ...project.platforms, [platform]: { ...post, ...value, dirty: dirty || post.dirty } } });
  const selectedImages = project.images.filter((image) => post.imageIds.includes(image.id));
  const full = combinePlatformContent(platform, post); const xWarning = platform === "x" && full.length > 280;
  const publishedChanged = post.status === "published" && post.publishRecord?.content !== full;
  const publish = (status: PlatformStatus) => patch({ status, publishRecord: status === "published" ? { publishedAt: new Date().toISOString(), content: full, imagePaths: selectedImages.map((image) => image.path), publishedUrl: post.publishedUrl } : post.publishRecord }, false);
  return <section className="post-card platform-editor"><div className="section-title"><div><h2>{PLATFORM_LABELS[platform]}</h2><p>{selectedImages.length} selected image(s)</p></div><label className="switch"><input type="checkbox" checked={post.enabled} onChange={(e) => patch({ enabled: e.target.checked }, false)} /> Enabled</label></div>
    <div className="image-selection-actions"><button onClick={()=>patch({imageIds:project.images.map((image)=>image.id)},false)}>Select all</button><button onClick={()=>patch({imageIds:[]},false)}>Clear</button></div><div className="platform-images">{project.images.map((image) => <label key={image.id} className={image.missing ? "missing" : ""}><input type="checkbox" checked={post.imageIds.includes(image.id)} onChange={(e) => patch({ imageIds: e.target.checked ? [...post.imageIds, image.id] : post.imageIds.filter((id) => id !== image.id) }, false)} />{image.fileName}</label>)}</div>
    {(platform === "pixiv" || platform === "mangaPlus") && <label>Title<input value={post.title} onChange={(e) => patch({ title: e.target.value })} /></label>}
    <label>Caption / Description<textarea className="caption" value={post.content} onChange={(e) => patch({ content: e.target.value })} /></label>
    {platform !== "mangaPlus" && <label>Hashtags / Tags<textarea value={post.tags} onChange={(e) => patch({ tags: e.target.value })} /></label>}
    <div className={`count ${xWarning || publishedChanged ? "warning" : ""}`}>{full.length} characters{xWarning ? " — X limit exceeded" : ""}{post.dirty ? " · Edited" : ""}{publishedChanged ? " · Changed after publishing" : ""}</div>
    <div className="platform-actions"><button onClick={() => void copy(full)}>Copy all</button>{platform === "pixiv" && <><button onClick={() => void copy(post.title)}>Copy title</button><button onClick={() => void copy(post.tags)}>Copy tags</button></>}<button onClick={() => void openPlatform(platform)}>Open platform ↗</button>
      <select value={post.status} onChange={(e) => publish(e.target.value as PlatformStatus)}>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
    {post.status === "published" && <label>Published URL<input placeholder="Optional" value={post.publishedUrl ?? ""} onChange={(e) => patch({ publishedUrl: e.target.value })} /></label>}
  </section>;
}

function Templates({ templates, onSave }: { templates: Record<PlatformType, PostTemplate>; onSave: (templates: PostTemplate[]) => void }) {
  const [drafts, setDrafts] = useState(templates); const [active, setActive] = useState<PlatformType>("x"); const current = drafts[active];
  const project = usePostStudioStore((state)=>state.selected);
  useEffect(() => setDrafts(templates), [templates]);
  return <section className="post-card templates"><div className="section-title"><div><h2>Templates</h2><p>Variables: {TEMPLATE_VARIABLES.map((key) => `{{${key}}}`).join(" · ")}</p></div><button onClick={() => onSave(PLATFORM_TYPES.map((platform) => drafts[platform]))}>Save templates</button></div>
    <div className="tabs">{PLATFORM_TYPES.map((platform) => <button className={active === platform ? "active" : ""} onClick={() => setActive(platform)} key={platform}>{PLATFORM_LABELS[platform]}</button>)}</div>
    <label>Title template<input value={current.title} onChange={(e) => setDrafts({ ...drafts, [active]: { ...current, title: e.target.value } })} /></label><label>Content template<textarea className="caption" value={current.content} onChange={(e) => setDrafts({ ...drafts, [active]: { ...current, content: e.target.value } })} /></label><label>Tags template<textarea value={current.tags} onChange={(e) => setDrafts({ ...drafts, [active]: { ...current, tags: e.target.value } })} /></label>
    {project && <div className="template-preview"><strong>Preview</strong><pre>{[renderTemplate(current.title,project),renderTemplate(current.content,project),renderTemplate(current.tags,project)].filter(Boolean).join("\n\n")}</pre></div>}
    <button onClick={() => setDrafts({ ...drafts, [active]: DEFAULT_TEMPLATES[active] })}>Restore {PLATFORM_LABELS[active]} default</button>
  </section>;
}

export function PostStudio() {
  const store = usePostStudioStore(); const [tab, setTab] = useState<"compose" | "templates">("compose"); const [platform, setPlatform] = useState<PlatformType>("x");
  const load = usePostStudioStore((state) => state.load);
  useEffect(() => { void load(); }, [load]);
  const project = store.selected; const duplicateWarning = useMemo(() => project && store.state?.projects.some((item) => item.id !== project.id && item.chapterNumber === project.chapterNumber), [project, store.state]);
  const generate = (target?: PlatformType) => {
    if (!project || !store.state) return; const targets = target ? [target] : PLATFORM_TYPES;
    if (targets.some((item) => project.platforms[item].dirty) && !confirm("部分平台文案已手動修改，確定覆蓋？")) return;
    let updated = project; for (const item of targets) updated = { ...updated, platforms: { ...updated.platforms, [item]: generatePlatformPost(updated, item, store.state.templates[item]) } }; store.update(updated);
  };
  return <main className="post-studio"><ProjectList /><div className="post-workspace"><header><div><small>MANGASPRINT</small><h1>發文工作室 <span>Post Studio</span></h1></div><nav><button className={tab === "compose" ? "active" : ""} onClick={() => setTab("compose")}>Compose</button><button className={tab === "templates" ? "active" : ""} onClick={() => setTab("templates")}>Templates</button></nav></header>
    {tab === "templates" && store.state ? <Templates templates={store.state.templates} onSave={(value) => void store.saveTemplates(value)} /> : !project ? <div className="studio-empty"><h2>Prepare every platform in one place.</h2><p>Create your first Post Project without changing the compact Sprint Tracker widget.</p><button className="primary" onClick={() => void store.newProject()}>Create Post Project</button></div> : <><div className="toolbar"><span>{duplicateWarning ? "⚠ This chapter already has another post project" : "Draft saved locally"}</span><button onClick={() => generate()}>Generate all platforms</button><button className="primary" disabled={store.busy} onClick={() => void store.save()}>Save</button></div><ProjectForm project={project} onChange={store.update} /><ImageLibrary project={project} onChange={store.update} /><div className="tabs platform-tabs">{PLATFORM_TYPES.map((item) => <button key={item} className={platform === item ? "active" : ""} onClick={() => setPlatform(item)}>{PLATFORM_LABELS[item]} <i className={project.platforms[item].status}>{project.platforms[item].status === "published" ? "●" : ""}</i></button>)}</div><div className="regenerate"><button onClick={() => generate(platform)}>Regenerate {PLATFORM_LABELS[platform]}</button></div><PlatformEditor project={project} platform={platform} onChange={store.update} /></>}
    {(store.error || store.notice) && <button className={`studio-toast ${store.error ? "bad" : ""}`} onClick={store.clearMessage}>{store.error ?? store.notice}</button>}
  </div></main>;
}
