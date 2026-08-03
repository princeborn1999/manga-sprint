import { useMemo, useState, type DragEvent } from "react";
import { chapterProgressPercent, currentChapter, cumulativePages } from "../../shared/calculations";
import { localDate } from "../../shared/date";
import { useAppStore } from "../stores/app";
import { moveProgress } from "../hooks/useProgress";
import { horizontalDragHandlers } from "../hooks/useHorizontalDrag";
import { ImportDialog } from "../dialogs/ImportDialog";

export function ProgressWidget() {
  const { state, busy, error, notice, updateProgress, updateChapterTotalPages, sync, previewImport } = useAppStore();
  const [fileDragging, setFileDragging] = useState(false);
  const chapter = useMemo(() => state ? currentChapter(state.chapters) : undefined, [state]);
  const fileDropHandlers = {
    onDragEnter: (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      setFileDragging(true);
    },
    onDragOver: (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setFileDragging(true);
    },
    onDragLeave: (event: DragEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFileDragging(false);
    },
    onDrop: (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      setFileDragging(false);
      const file = event.dataTransfer.files.item(0);
      if (!file) return;
      const filePath = window.mangaSprint.getPathForFile(file);
      if (filePath) {
        void (async () => {
          if (state?.settings.widgetCollapsed) await useAppStore.getState().toggleCollapsed();
          await previewImport(filePath);
        })();
      }
    },
  };
  if (!state) return <main className="shell loading">載入 MangaSprint…</main>;
  const topDocked = state.settings.dockPosition.startsWith("top-") && !state.settings.lockWindowPosition;
  const horizontalDrag = horizontalDragHandlers(topDocked);
  const toggleCollapsed = () => void useAppStore.getState().toggleCollapsed();
  const collapsedDrag = horizontalDragHandlers(topDocked, toggleCollapsed);
  if (!chapter && state.settings.widgetCollapsed) return <main className={`island collapsed ${fileDragging ? "drop-ready" : ""}`} {...fileDropHandlers}>
    <div className="island-content" role="button" tabIndex={0} title="展開 MangaSprint" {...collapsedDrag}>
      <span className="dot" />
      <strong>尚未匯入</strong>
    </div>
  </main>;
  if (!chapter) return <main className={`shell empty-state ${fileDragging ? "drop-ready" : ""}`} {...fileDropHandlers}>
    <button className="collapse-bar no-drag" title="收合到螢幕邊緣" onClick={toggleCollapsed}>⌃</button>
    <header className={!state.settings.lockWindowPosition && state.settings.dockPosition === "free" ? "drag" : ""} {...horizontalDrag}>
      <div><strong>MangaSprint</strong></div>
    </header>
    <section className="empty-content no-drag">
      <strong>尚未匯入進度</strong>
      <p>選擇橫向 Excel 後，會自動辨識話數、日期與目前進度。</p>
      <button className="primary" disabled={busy} onClick={() => void previewImport()}>匯入 Excel</button>
    </section>
    {(error || notice) && <button className={`toast ${error ? "bad" : ""}`} onClick={() => useAppStore.getState().clearMessage()}>{error ?? notice}</button>}
    <ImportDialog />
  </main>;
  if (state.settings.widgetCollapsed) return <main className={`island collapsed ${fileDragging ? "drop-ready" : ""}`} {...fileDropHandlers}>
    <div
      className="island-content"
      role="button"
      tabIndex={0}
      title="展開 MangaSprint"
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") toggleCollapsed();
      }}
      {...collapsedDrag}
    >
      <span className={`dot ${state.settings.syncStatus}`} />
      <strong>CH {chapter.chapterNumber}</strong>
      <small>{chapter.actualCompletedPages}/{chapter.totalPages}</small>
    </div>
  </main>;
  const plan = state.dailyPlan.filter((p) => p.date <= localDate()).at(-1);
  const actualTotal = cumulativePages(state.chapters, { chapterNumber: chapter.chapterNumber, page: chapter.actualCompletedPages });
  const idealTotal = plan ? cumulativePages(state.chapters, { chapterNumber: plan.chapterNumber, page: plan.idealPage }) : 0;
  const gap = actualTotal - idealTotal;
  const idealPercent = plan?.idealPercent ?? 0;
  const actualPercent = chapterProgressPercent(chapter);
  const change = (delta: -1 | 1) => { const point = moveProgress(state.chapters, delta); if (point) void updateProgress(point); };
  const changeTotalPages = (delta: -1 | 1) => {
    const totalPages = chapter.totalPages + delta;
    if (totalPages < 1 || totalPages > 100_000) return;
    if (totalPages < chapter.actualCompletedPages) {
      const removed = chapter.actualCompletedPages - totalPages;
      const confirmed = window.confirm(`總頁數改為 ${totalPages} 頁後，已完成頁數也會刪除 ${removed} 頁。確定要刪除嗎？`);
      if (!confirmed) return;
    }
    void updateChapterTotalPages({ chapterNumber: chapter.chapterNumber, totalPages });
  };
  return <main className={`shell ${fileDragging ? "drop-ready" : ""}`} {...fileDropHandlers}>
    <button className="collapse-bar no-drag" title="收合到螢幕邊緣" onClick={toggleCollapsed}>⌃</button>
    <header className={!state.settings.lockWindowPosition && state.settings.dockPosition === "free" ? "drag" : ""} {...horizontalDrag}>
      <div><strong>{state.settings.projectName}</strong></div>
    </header>
    <section className="hero">
      <div className="chapter-tag">CHAPTER {chapter.chapterNumber}</div>
      <div className="progress-row">
        <b>{chapter.actualCompletedPages}</b>
        <span>/</span>
        <div className="total-pages-control no-drag" aria-label="調整總頁數">
          <button className="total-page-button" aria-label="總頁數減少一頁" title="刪除一頁" disabled={busy || chapter.totalPages <= 1} onClick={() => changeTotalPages(-1)}>−</button>
          <strong>{chapter.totalPages}</strong>
          <button className="total-page-button" aria-label="總頁數增加一頁" title="增加一頁" disabled={busy} onClick={() => changeTotalPages(1)}>＋</button>
        </div>
        <span>頁</span>
        <em>{actualPercent}%</em>
      </div>
      <div className="track"><i style={{ width: `${actualPercent}%` }} /></div>
    </section>
    <section className={`pace-summary ${gap < 0 ? "behind" : gap > 0 ? "ahead" : "on-track"}`}>
      <div><span>理想進度</span><b>{idealPercent}%</b></div>
      <strong>{gap > 0 ? `+${gap}` : gap} 頁</strong>
    </section>
    <section className="actions no-drag">
      <button className="step minus" disabled={busy} onClick={() => change(-1)}>−1</button>
      <button className="step plus" disabled={busy} onClick={() => change(1)}>{chapter.actualCompletedPages === chapter.totalPages && !chapter.dialogueComplete ? "完成台詞 +1%" : "＋1 頁"}</button>
    </section>
    <footer className="no-drag">
      <span className={`sync ${state.settings.syncStatus}`}>{state.settings.hasPendingSync ? "● 待寫入 Excel" : "● 已同步"}</span>
      <button onClick={() => void sync()} disabled={busy || !state.settings.excelFilePath}>同步</button>
      <button onClick={() => void previewImport()}>匯入</button>
      <button onClick={() => void window.mangaSprint.openPostStudio()}>發文</button>
    </footer>
    {(error || notice) && <button className={`toast ${error ? "bad" : ""}`} onClick={() => useAppStore.getState().clearMessage()}>{error ?? notice}</button>}
    <ImportDialog />
  </main>;
}
