import { useEffect, useMemo, useState, type DragEvent } from "react";
import type { PostProject, PostType } from "../../shared/post-studio/types";
import { captionFor, type SimplePostType } from "../../shared/post-studio/simpleFormats";
import { usePostStudioStore } from "../stores/postStudio";

const POST_TABS: Array<{ type: SimplePostType; label: string; hint: string }> = [
  { type: "new-chapter", label: "漫畫更新", hint: "Chapter update" },
  { type: "character-introduction", label: "角色圖", hint: "Character art" },
  { type: "cover", label: "封面", hint: "Volume cover" },
];

function AttachedImages({ project }: { project: PostProject }) {
  const { previews, update } = usePostStudioStore();
  const remove = (id: string) => update({ ...project, images: project.images.filter((image) => image.id !== id) });
  const move = (index: number, delta: -1 | 1) => {
    const next = index + delta; if (next < 0 || next >= project.images.length) return;
    const images = [...project.images]; [images[index], images[next]] = [images[next], images[index]]; update({ ...project, images });
  };
  if (!project.images.length) return null;
  return <div className="simple-image-grid">{project.images.map((image, index) => <article key={image.id} className={image.missing ? "missing" : ""}>
    {previews[image.id] ? <img src={previews[image.id]} alt="" /> : <div className="missing-preview">Missing</div>}
    <span>{image.fileName}</span>
    <button className="remove" onClick={() => remove(image.id)}>×</button>
    <div className="order"><button disabled={index === 0} onClick={() => move(index, -1)}>←</button><button disabled={index === project.images.length - 1} onClick={() => move(index, 1)}>→</button></div>
  </article>)}</div>;
}

export function PostStudio() {
  const store = usePostStudioStore();
  const load = usePostStudioStore((state) => state.load);
  const newProject = usePostStudioStore((state) => state.newProject);
  const [type, setType] = useState<SimplePostType>("new-chapter");
  const [dragging, setDragging] = useState(false);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (store.state && !store.selected && !store.busy) void newProject(); }, [store.state, store.selected, store.busy, newProject]);
  const project = store.selected;
  const caption = useMemo(() => project ? captionFor(project, type) : "", [project, type]);

  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault(); setDragging(false);
    const paths = Array.from(event.dataTransfer.files).map((file) => window.mangaSprint.getPathForFile(file)).filter(Boolean);
    if (paths.length) void store.attachImages(paths);
  };
  if (!project) return <main className="simple-studio loading-studio">Loading Post Studio…</main>;
  const patch = (value: Partial<PostProject>) => store.update({ ...project, ...value });
  const switchType = (next: SimplePostType) => {
    setType(next);
    const postType: PostType = next === "cover" ? "manga-panel" : next;
    patch({ postType, chapterTitle: next === "character-introduction" ? "Dragon" : next === "cover" ? "Volume 1 Cover" : "" });
  };

  return <main className="simple-studio">
    <header><div><small>MANGASPRINT</small><h1>發文工作室 <span>Post Studio</span></h1></div><div className="header-actions"><button onClick={() => void store.newProject(project.chapterNumber)}>清空</button><button className="primary" disabled={store.busy} onClick={() => void store.save()}>儲存草稿</button></div></header>

    <nav className="post-type-tabs">{POST_TABS.map((tab) => <button key={tab.type} className={type === tab.type ? "active" : ""} onClick={() => switchType(tab.type)}><strong>{tab.label}</strong><small>{tab.hint}</small></button>)}</nav>

    <section className="simple-layout">
      <div className="simple-left">
        <div className={`attach-zone ${dragging ? "dragging" : ""}`} onDragEnter={(e) => { e.preventDefault(); setDragging(true); }} onDragOver={(e) => e.preventDefault()} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false); }} onDrop={drop}>
          <div className="attach-icon">＋</div><h2>把圖片拖到這裡</h2><p>Drop manga images here, or choose files</p><button className="primary" onClick={() => void store.addImages()}>Attach images</button><small>JPG · PNG · WEBP</small>
        </div>
        <AttachedImages project={project} />
      </div>

      <section className="caption-panel">
        <div className="caption-heading"><div><small>POST FORMAT</small><h2>{POST_TABS.find((tab) => tab.type === type)?.label}</h2></div><span>{caption.length} characters</span></div>
        {type === "new-chapter" ? <label>Chapter number<input type="number" min="0" value={project.chapterNumber} onChange={(e) => patch({ chapterNumber: Number(e.target.value) })} /></label> : <label>{type === "character-introduction" ? "Character name" : "Cover title"}<input value={project.chapterTitle} onChange={(e) => patch({ chapterTitle: e.target.value })} /></label>}
        <pre className="caption-preview">{caption}</pre>
        <div className="simple-actions"><button className="primary copy-caption" onClick={() => void store.copy(caption)}>Copy caption</button><button onClick={() => void store.openPlatform("x")}>Open X ↗</button><button onClick={() => void store.openPlatform("instagram")}>Open Instagram ↗</button></div>
      </section>
    </section>
    {(store.error || store.notice) && <button className={`studio-toast ${store.error ? "bad" : ""}`} onClick={store.clearMessage}>{store.error ?? store.notice}</button>}
  </main>;
}
