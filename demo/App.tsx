import { useState } from "react";
import "./style.css";

const RELEASE_URL =
  "https://github.com/princeborn1999/MangaSprint/releases/latest";
const REPOSITORY_URL = "https://github.com/princeborn1999/MangaSprint";

function DemoWidget() {
  const [collapsed, setCollapsed] = useState(false);
  const [completed, setCompleted] = useState(9);
  const [total, setTotal] = useState(18);
  const idealPercent = 67;
  const actualPercent = Math.round((completed / total) * 100);
  const idealPages = Math.round((idealPercent / 100) * total);
  const gap = completed - idealPages;

  const changeTotal = (delta: -1 | 1) => {
    const next = Math.max(1, total + delta);
    setTotal(next);
    setCompleted((current) => Math.min(current, next));
  };

  if (collapsed) {
    return (
      <button
        className="island"
        onClick={() => setCollapsed(false)}
        aria-label="展開 MangaSprint Demo Widget"
      >
        <span className="status-dot" />
        <strong>CH 11</strong>
        <span>
          {completed}/{total}
        </span>
        <small>點我展開</small>
      </button>
    );
  }

  return (
    <article className="widget" aria-label="MangaSprint 互動示範">
      <button
        className="collapse"
        onClick={() => setCollapsed(true)}
        aria-label="縮小 MangaSprint Demo Widget"
      >
        ⌃
      </button>
      <header>
        <span className="eyebrow">MANGASPRINT</span>
        <strong>Gorilla Sprint</strong>
      </header>

      <section className="hero-card">
        <span className="chapter">CHAPTER 11</span>
        <div className="numbers">
          <b>{completed}</b>
          <span>/</span>
          <div className="total-control">
            <button onClick={() => changeTotal(-1)} aria-label="減少總頁數">
              −
            </button>
            <strong>{total}</strong>
            <button onClick={() => changeTotal(1)} aria-label="增加總頁數">
              ＋
            </button>
          </div>
          <em>{actualPercent}%</em>
        </div>
        <div className="track" aria-label={`實際進度 ${actualPercent}%`}>
          <i style={{ width: `${actualPercent}%` }} />
        </div>
      </section>

      <section className={`pace ${gap < 0 ? "behind" : "ahead"}`}>
        <div>
          <span>理想進度</span>
          <b>{idealPercent}%</b>
        </div>
        <strong>
          {gap > 0 ? `＋${gap}` : gap === 0 ? "準時" : `−${Math.abs(gap)}`}{" "}
          {gap === 0 ? "" : "頁"}
        </strong>
      </section>

      <div className="actions">
        <button onClick={() => setCompleted((value) => Math.max(0, value - 1))}>
          −1 頁
        </button>
        <button
          className="primary"
          onClick={() => setCompleted((value) => Math.min(total, value + 1))}
        >
          ＋1 頁
        </button>
      </div>

      <footer>
        <span>
          <i />
          Demo 已同步
        </span>
        <button type="button" disabled>
          匯入
        </button>
        <button type="button" disabled>
          同步
        </button>
      </footer>
    </article>
  );
}

export function App() {
  return (
    <main>
      <nav>
        <a className="brand" href={REPOSITORY_URL}>
          MangaSprint
        </a>
        <div>
          <a href="#how-it-works">功能</a>
          <a className="nav-download" href={RELEASE_URL}>
            下載 Windows 版
          </a>
        </div>
      </nav>

      <section className="intro">
        <div className="copy">
          <span className="pill">WINDOWS 漫畫製作進度 WIDGET</span>
          <h1>
            今天該畫到哪，
            <br />
            <em>抬頭就知道。</em>
          </h1>
          <p>
            MangaSprint
            依照每話排程計算今天的理想進度，讓漫畫創作者用最少的操作掌握領先或落後幾頁。
          </p>
          <div className="cta-row">
            <a className="cta" href={RELEASE_URL}>
              下載 Windows x64
            </a>
            <a className="text-link" href={REPOSITORY_URL}>
              查看完整操作手冊 →
            </a>
          </div>
          <small>免登入・資料留在本機・Excel 可讀備份</small>
        </div>

        <div className="stage">
          <div className="screen-label">
            <span />
            這裡可以直接操作
          </div>
          <DemoWidget />
          <p>試著按 ＋1 頁、調整總頁數，或縮小 Widget</p>
        </div>
      </section>

      <section className="features" id="how-it-works">
        <article>
          <span>01</span>
          <h2>日期自動換算</h2>
          <p>依每話工作期間，直接顯示今天應達到的理想百分比。</p>
        </article>
        <article>
          <span>02</span>
          <h2>一鍵更新頁數</h2>
          <p>完成一頁就按一下，領先或落後的頁數立即重新計算。</p>
        </article>
        <article>
          <span>03</span>
          <h2>本機安全保存</h2>
          <p>狀態先存本機，再安全同步 Excel；檔案被鎖定也不丟進度。</p>
        </article>
      </section>

      <section className="desktop-note">
        <div>
          <span>WEB DEMO 與桌面版的差異</span>
          <h2>網站讓你看懂體驗，安裝版才是真正的工作工具。</h2>
        </div>
        <p>
          此頁只使用匿名示範資料。Excel
          匯入與同步、系統匣、永遠置頂、螢幕頂端拖曳、開機啟動及本機快取，皆為
          Windows 安裝版限定功能。
        </p>
      </section>

      <footer className="site-footer">
        <strong>MangaSprint</strong>
        <span>為漫畫創作者設計的本機進度追蹤工具</span>
        <a href={REPOSITORY_URL}>GitHub</a>
      </footer>
    </main>
  );
}
