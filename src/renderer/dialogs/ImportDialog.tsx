import { useState } from "react";
import { useAppStore } from "../stores/app";

export function ImportDialog() {
  const preview = useAppStore((s) => s.importPreview);
  const [defaultTotalPages, setDefaultTotalPages] = useState(18);
  if (!preview) return null;
  const firstChapter = preview.chapters[0];
  const lastChapter = preview.chapters.at(-1);
  const currentChapter = preview.chapters.find((chapter) => chapter.actualCompletedPages < 100) ?? lastChapter;
  const validTotalPages = Number.isInteger(defaultTotalPages) && defaultTotalPages > 0;
  const preservesTotalPages = preview.preserveTotalPages === true;
  return <div className="overlay no-drag"><div className="dialog">
    <h2>確認匯入</h2>
    <p>原始檔只讀取，不會修改。確認後會建立新的 MangaSprint Excel。</p>
    <div className="import-summary">
      <span>辨識話數</span><strong>{preview.chapters.length} 話</strong>
      <span>範圍</span><strong>CH {firstChapter?.chapterNumber}–{lastChapter?.chapterNumber}</strong>
      <span>目前進度</span><strong>CH {currentChapter?.chapterNumber}・{currentChapter?.actualCompletedPages}%</strong>
    </div>
    <label>每話預設總頁數
      <input type="number" min="1" max="100000" value={defaultTotalPages} disabled={preservesTotalPages} onChange={(event) => setDefaultTotalPages(Number(event.target.value))} />
    </label>
    <p className="dialog-note">{preservesTotalPages ? "這是 MangaSprint Excel，將保留每話既有總頁數與實際進度。" : "目前統一以 18 頁匯入；之後可針對特殊話數調整。"}</p>
    <div className="dialog-actions"><button onClick={() => useAppStore.setState({ importPreview: undefined })}>取消</button><button className="primary" disabled={!validTotalPages} onClick={() => void useAppStore.getState().finishImport(defaultTotalPages)}>匯入並建立</button></div>
  </div></div>;
}
