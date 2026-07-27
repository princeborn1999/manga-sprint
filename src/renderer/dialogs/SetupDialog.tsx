import { useState } from "react";
import type { ChapterInput } from "../../preload/types";
import { localDate } from "../../shared/date";
import { useAppStore } from "../stores/app";

export function SetupDialog({ onClose }: { onClose(): void }) {
  const [projectName, setProjectName] = useState("MangaSprint Vol.2");
  const [chapters, setChapters] = useState<ChapterInput[]>([
    { chapterNumber: 11, title: "Chapter 11", totalPages: 18, startDate: localDate(), targetEndDate: localDate() },
    { chapterNumber: 12, title: "Chapter 12", totalPages: 18, startDate: localDate(), targetEndDate: localDate() },
    { chapterNumber: 13, title: "Chapter 13", totalPages: 20, startDate: localDate(), targetEndDate: localDate() },
  ]);
  const update = (index: number, patch: Partial<ChapterInput>) => setChapters((items) => items.map((item, i) => i === index ? { ...item, ...patch } : item));
  const submit = async () => { await useAppStore.getState().createExcel(projectName, chapters); if (!useAppStore.getState().error) onClose(); };
  return <div className="overlay no-drag"><div className="dialog">
    <h2>建立新專案</h2>
    <label>專案名稱<input value={projectName} onChange={(e) => setProjectName(e.target.value)} /></label>
    <div className="chapter-list">{chapters.map((c, i) => <div className="chapter-input" key={i}>
      <input aria-label="話數" type="number" value={c.chapterNumber} onChange={(e) => update(i, { chapterNumber: Number(e.target.value) })} />
      <input aria-label="標題" value={c.title} onChange={(e) => update(i, { title: e.target.value })} />
      <input aria-label="總頁數" type="number" value={c.totalPages} onChange={(e) => update(i, { totalPages: Number(e.target.value) })} />
      <input aria-label="開始日" type="date" value={c.startDate} onChange={(e) => update(i, { startDate: e.target.value })} />
      <input aria-label="目標日" type="date" value={c.targetEndDate} onChange={(e) => update(i, { targetEndDate: e.target.value })} />
      <button onClick={() => setChapters((items) => items.filter((_, n) => n !== i))}>刪除</button>
    </div>)}</div>
    <button onClick={() => setChapters((items) => [...items, { chapterNumber: items.length + 1, title: `Chapter ${items.length + 1}`, totalPages: 20, startDate: localDate(), targetEndDate: localDate() }])}>＋ 新增話數</button>
    <div className="dialog-actions"><button onClick={onClose}>取消</button><button className="primary" onClick={() => void submit()}>選擇位置並建立</button></div>
  </div></div>;
}
