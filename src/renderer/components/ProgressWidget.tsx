import { useMemo, useState, type DragEvent } from "react";
import {
  chapterProgressPercent,
  cumulativePages,
  currentChapter,
  projectTodaySummary,
} from "../../shared/calculations";
import { localDate } from "../../shared/date";
import type { MangaProject } from "../../shared/types";
import { useAppStore } from "../stores/app";
import { moveProgress } from "../hooks/useProgress";
import { horizontalDragHandlers } from "../hooks/useHorizontalDrag";
import { ImportDialog } from "../dialogs/ImportDialog";

function ProjectTabs({
  projects,
  active,
}: {
  projects: MangaProject[];
  active: string;
}) {
  const { busy, selectTab, previewImport } = useAppStore();
  return (
    <nav className="project-tabs no-drag" aria-label="漫畫專案">
      <div
        className="project-tabs-list"
        onWheel={(event) => {
          if (Math.abs(event.deltaY) > Math.abs(event.deltaX))
            if (
              event.currentTarget.scrollWidth > event.currentTarget.clientWidth
            )
              event.currentTarget.scrollLeft += event.deltaY;
        }}
      >
        {projects.map((project) => {
          const name = project.state.settings.projectName;
          const shortName = name.replace(/_sprint(?:_.*)?$/i, "");
          return (
            <button
              key={project.id}
              className={`project-tab ${active === project.id ? "active" : ""}`}
              title={name}
              aria-label={name}
              onClick={() => void selectTab(project.id)}
            >
              {shortName || name}
            </button>
          );
        })}
      </div>
      <button
        className={`project-tab summary-tab ${active === "summary" ? "active" : ""}`}
        onClick={() => void selectTab("summary")}
      >
        總結
      </button>
      <button
        className="project-tab add-tab"
        title="匯入另一部漫畫"
        disabled={busy}
        onClick={() => void previewImport()}
      >
        ＋
      </button>
    </nav>
  );
}

function SummaryView({ projects }: { projects: MangaProject[] }) {
  const summaries = projects.map((project) => projectTodaySummary(project));
  const totalMissing = summaries.reduce(
    (sum, item) => sum + item.missingPages,
    0,
  );
  const { busy, syncAll, selectTab, previewImport } = useAppStore();
  return (
    <section className="summary-view no-drag">
      <div className={`summary-total ${totalMissing === 0 ? "complete" : ""}`}>
        <span>今天總共還缺</span>
        <strong>{totalMissing} 頁</strong>
      </div>
      <div className="summary-list">
        {summaries.map((item) => (
          <button
            className="summary-item"
            key={item.projectId}
            onClick={() => void selectTab(item.projectId)}
          >
            <span>
              <b>{item.projectName}</b>
              <small>
                {item.chapterNumber ? `CH ${item.chapterNumber}` : "尚無話數"}
              </small>
            </span>
            <b className={item.missingPages ? "" : "complete"}>
              {item.missingPages
                ? `缺 ${item.missingPages} 頁`
                : item.gapPages > 0
                  ? `超前 ${item.gapPages} 頁`
                  : "準時"}
            </b>
          </button>
        ))}
        {!projects.length && <div className="summary-empty">尚未匯入漫畫</div>}
      </div>
      <div className="summary-actions">
        <button className="primary" onClick={() => void previewImport()}>
          ＋ 匯入漫畫
        </button>
        <button
          disabled={busy || !projects.length}
          onClick={() => void syncAll()}
        >
          同步全部
        </button>
      </div>
    </section>
  );
}

export function ProgressWidget() {
  const {
    workspace,
    viewTab,
    busy,
    error,
    notice,
    updateProgress,
    updateChapterTotalPages,
    sync,
    previewImport,
  } = useAppStore();
  const [fileDragging, setFileDragging] = useState(false);
  const project = workspace?.projects.find((item) => item.id === viewTab);
  const activeProject =
    workspace?.projects.find((item) => item.id === workspace.activeProjectId) ??
    workspace?.projects[0];
  const chapter = useMemo(
    () => (project ? currentChapter(project.state.chapters) : undefined),
    [project],
  );
  const targetProjectId = project?.id;
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
      if (!event.currentTarget.contains(event.relatedTarget as Node | null))
        setFileDragging(false);
    },
    onDrop: (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      setFileDragging(false);
      const file = event.dataTransfer.files.item(0);
      if (!file) return;
      const filePath = window.mangaSprint.getPathForFile(file);
      if (filePath)
        void (async () => {
          if (workspace?.settings.widgetCollapsed)
            await useAppStore.getState().toggleCollapsed();
          await previewImport(filePath, targetProjectId);
        })();
    },
  };
  if (!workspace)
    return <main className="shell loading">載入 MangaSprint…</main>;
  const topDocked =
    workspace.settings.dockPosition.startsWith("top-") &&
    !workspace.settings.lockWindowPosition;
  const horizontalDrag = horizontalDragHandlers(topDocked);
  const toggleCollapsed = () => void useAppStore.getState().toggleCollapsed();
  const collapsedDrag = horizontalDragHandlers(topDocked, toggleCollapsed);
  const collapsedChapter = activeProject
    ? currentChapter(activeProject.state.chapters)
    : undefined;
  if (workspace.settings.widgetCollapsed)
    return (
      <main
        className={`island collapsed ${fileDragging ? "drop-ready" : ""}`}
        {...fileDropHandlers}
      >
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
          <span
            className={`dot ${activeProject?.state.settings.syncStatus ?? "synced"}`}
          />
          <strong>
            {activeProject
              ? activeProject.state.settings.projectName
              : "尚未匯入"}
          </strong>
          {collapsedChapter && (
            <small>
              CH {collapsedChapter.chapterNumber}・
              {collapsedChapter.actualCompletedPages}/
              {collapsedChapter.totalPages}
            </small>
          )}
        </div>
      </main>
    );

  const shellStart = (
    <>
      <button
        className="collapse-bar no-drag"
        title="收合到螢幕邊緣"
        onClick={toggleCollapsed}
      >
        ⌃
      </button>
      <ProjectTabs projects={workspace.projects} active={viewTab} />
    </>
  );
  const messages = (error || notice) && (
    <button
      className={`toast ${error ? "bad" : ""}`}
      onClick={() => useAppStore.getState().clearMessage()}
    >
      {error ?? notice}
    </button>
  );

  if (viewTab === "summary" || !project)
    return (
      <main
        className={`shell ${fileDragging ? "drop-ready" : ""}`}
        {...fileDropHandlers}
      >
        {shellStart}
        <header className={topDocked ? "" : "drag"} {...horizontalDrag}>
          <div>
            <strong>全部漫畫</strong>
          </div>
        </header>
        <SummaryView projects={workspace.projects} />
        {messages}
        <ImportDialog />
      </main>
    );

  if (!chapter)
    return (
      <main
        className={`shell empty-state ${fileDragging ? "drop-ready" : ""}`}
        {...fileDropHandlers}
      >
        {shellStart}
        <header className={topDocked ? "" : "drag"} {...horizontalDrag}>
          <div>
            <strong>{project.state.settings.projectName}</strong>
          </div>
        </header>
        <section className="empty-content no-drag">
          <strong>尚未匯入進度</strong>
          <p>為這個漫畫選擇 Excel。</p>
          <button
            className="primary"
            disabled={busy}
            onClick={() => void previewImport(undefined, project.id)}
          >
            匯入 Excel
          </button>
        </section>
        {messages}
        <ImportDialog />
      </main>
    );

  const plan = project.state.dailyPlan
    .filter((item) => item.date <= localDate())
    .at(-1);
  const actualTotal = cumulativePages(project.state.chapters, {
    chapterNumber: chapter.chapterNumber,
    page: chapter.actualCompletedPages,
  });
  const idealTotal = plan
    ? cumulativePages(project.state.chapters, {
        chapterNumber: plan.chapterNumber,
        page: plan.idealPage,
      })
    : 0;
  const gap = actualTotal - idealTotal;
  const actualPercent = chapterProgressPercent(chapter);
  const change = (delta: -1 | 1) => {
    const point = moveProgress(project.state.chapters, delta);
    if (point) void updateProgress(project.id, point);
  };
  const changeTotalPages = (delta: -1 | 1) => {
    const totalPages = chapter.totalPages + delta;
    if (totalPages < 1 || totalPages > 100_000) return;
    if (
      totalPages < chapter.actualCompletedPages &&
      !window.confirm(
        `總頁數改為 ${totalPages} 頁後，會刪除 ${chapter.actualCompletedPages - totalPages} 頁已完成進度。確定嗎？`,
      )
    )
      return;
    void updateChapterTotalPages(project.id, {
      chapterNumber: chapter.chapterNumber,
      totalPages,
    });
  };
  return (
    <main
      className={`shell ${fileDragging ? "drop-ready" : ""}`}
      {...fileDropHandlers}
    >
      {shellStart}
      <header className={topDocked ? "" : "drag"} {...horizontalDrag}>
        <div>
          <strong>{project.state.settings.projectName}</strong>
        </div>
      </header>
      <section className="hero">
        <div className="chapter-tag">CHAPTER {chapter.chapterNumber}</div>
        <div className="progress-row">
          <b>{chapter.actualCompletedPages}</b>
          <span>/</span>
          <div className="total-pages-control no-drag">
            <button
              className="total-page-button"
              disabled={busy || chapter.totalPages <= 1}
              onClick={() => changeTotalPages(-1)}
            >
              −
            </button>
            <strong>{chapter.totalPages}</strong>
            <button
              className="total-page-button"
              disabled={busy}
              onClick={() => changeTotalPages(1)}
            >
              ＋
            </button>
          </div>
          <span>頁</span>
          <em>{actualPercent}%</em>
        </div>
        <div className="track">
          <i style={{ width: `${actualPercent}%` }} />
        </div>
      </section>
      <section
        className={`pace-summary ${gap < 0 ? "behind" : gap > 0 ? "ahead" : "on-track"}`}
      >
        <div>
          <span>理想進度</span>
          <b>{plan?.idealPercent ?? 0}%</b>
        </div>
        <strong>{gap > 0 ? `+${gap}` : gap} 頁</strong>
      </section>
      <section className="actions no-drag">
        <button
          className="step minus"
          disabled={busy}
          onClick={() => change(-1)}
        >
          −1
        </button>
        <button className="step plus" disabled={busy} onClick={() => change(1)}>
          {chapter.actualCompletedPages === chapter.totalPages &&
          !chapter.dialogueComplete
            ? "完成台詞 +1%"
            : "＋1 頁"}
        </button>
      </section>
      <footer className="no-drag">
        <span className={`sync ${project.state.settings.syncStatus}`}>
          {project.state.settings.hasPendingSync ? "● 待寫入" : "● 已同步"}
        </span>
        <button
          onClick={() => void sync(project.id)}
          disabled={busy || !project.state.settings.excelFilePath}
        >
          同步
        </button>
        <button onClick={() => void previewImport(undefined, project.id)}>
          重匯
        </button>
      </footer>
      {messages}
      <ImportDialog />
    </main>
  );
}
