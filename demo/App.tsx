import { useEffect, useState } from "react";
import "./style.css";

const RELEASE_URL =
  "https://github.com/princeborn1999/manga-sprint/releases/latest";
const REPOSITORY_URL = "https://github.com/princeborn1999/manga-sprint";

type Language = "en" | "zh";

const copy = {
  en: {
    navFeatures: "Features",
    download: "Download for Windows",
    badge: "A WINDOWS PROGRESS WIDGET FOR MANGA CREATORS",
    headline: "Know exactly where",
    headlineAccent: "today's work should be.",
    intro:
      "MangaSprint turns every chapter schedule into a clear daily target, so you always know whether you are ahead or behind—and by how many pages.",
    manual: "View the full guide →",
    reassurance: "No sign-in · Local-first data · Human-readable Excel backup",
    interactive: "TRY THE LIVE WIDGET",
    hint: "Add a page, adjust the chapter length, or collapse the widget",
    featureOneTitle: "A daily target, calculated",
    featureOne:
      "Your chapter dates become an ideal completion percentage for today.",
    featureTwoTitle: "One-click progress",
    featureTwo:
      "Finish a page, tap once, and instantly see how far ahead or behind you are.",
    featureThreeTitle: "Safe, local records",
    featureThree:
      "Progress is saved locally first, then safely synchronized to an Excel workbook.",
    differenceLabel: "WEB DEMO VS. DESKTOP APP",
    differenceTitle:
      "The website shows the experience. The Windows app does the real work.",
    difference:
      "This demo uses anonymous sample data only. Excel import and sync, system tray, always-on-top mode, top-edge dragging, autostart, and local persistence are available in the Windows app.",
    footer: "A local progress tracker made for manga creators",
    expand: "Click to expand",
    collapseLabel: "Collapse the MangaSprint demo widget",
    expandLabel: "Expand the MangaSprint demo widget",
    ideal: "IDEAL",
    pages: "pages",
    onTrack: "ON TRACK",
    minusPage: "−1 page",
    plusPage: "+1 page",
    synced: "Demo synced",
    import: "Import",
    sync: "Sync",
    demoLabel: "Interactive MangaSprint demo",
    actualLabel: "Actual progress",
    decreaseTotal: "Decrease total pages",
    increaseTotal: "Increase total pages",
  },
  zh: {
    navFeatures: "功能",
    download: "下載 Windows 版",
    badge: "WINDOWS 漫畫製作進度 WIDGET",
    headline: "今天該畫到哪，",
    headlineAccent: "抬頭就知道。",
    intro:
      "MangaSprint 依照每話排程計算今天的理想進度，讓漫畫創作者用最少的操作掌握領先或落後幾頁。",
    manual: "查看完整操作手冊 →",
    reassurance: "免登入・資料留在本機・Excel 可讀備份",
    interactive: "這裡可以直接操作",
    hint: "試著按＋1 頁、調整總頁數，或縮小 Widget",
    featureOneTitle: "日期自動換算",
    featureOne: "依每話工作期間，直接顯示今天應達到的理想百分比。",
    featureTwoTitle: "一鍵更新頁數",
    featureTwo: "完成一頁就按一下，領先或落後的頁數立即重新計算。",
    featureThreeTitle: "本機安全保存",
    featureThree: "狀態先存本機，再安全同步 Excel；檔案被鎖定也不丟進度。",
    differenceLabel: "WEB DEMO 與桌面版的差異",
    differenceTitle: "網站讓你看懂體驗，安裝版才是真正的工作工具。",
    difference:
      "此頁只使用匿名示範資料。Excel 匯入與同步、系統匣、永遠置頂、螢幕頂端拖曳、開機啟動及本機快取，皆為 Windows 安裝版限定功能。",
    footer: "為漫畫創作者設計的本機進度追蹤工具",
    expand: "點我展開",
    collapseLabel: "縮小 MangaSprint Demo Widget",
    expandLabel: "展開 MangaSprint Demo Widget",
    ideal: "理想進度",
    pages: "頁",
    onTrack: "準時",
    minusPage: "−1 頁",
    plusPage: "＋1 頁",
    synced: "Demo 已同步",
    import: "匯入",
    sync: "同步",
    demoLabel: "MangaSprint 互動示範",
    actualLabel: "實際進度",
    decreaseTotal: "減少總頁數",
    increaseTotal: "增加總頁數",
  },
} as const;

function DemoWidget({ language }: { language: Language }) {
  const text = copy[language];
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
        aria-label={text.expandLabel}
      >
        <span className="status-dot" />
        <strong>CH 11</strong>
        <span>
          {completed}/{total}
        </span>
        <small>{text.expand}</small>
      </button>
    );
  }

  const gapText =
    gap > 0
      ? `+${gap} ${text.pages}`
      : gap === 0
        ? text.onTrack
        : `−${Math.abs(gap)} ${text.pages}`;

  return (
    <article className="widget" aria-label={text.demoLabel}>
      <button
        className="collapse"
        onClick={() => setCollapsed(true)}
        aria-label={text.collapseLabel}
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
            <button
              onClick={() => changeTotal(-1)}
              aria-label={text.decreaseTotal}
            >
              −
            </button>
            <strong>{total}</strong>
            <button
              onClick={() => changeTotal(1)}
              aria-label={text.increaseTotal}
            >
              ＋
            </button>
          </div>
          <em>{actualPercent}%</em>
        </div>
        <div
          className="track"
          aria-label={`${text.actualLabel} ${actualPercent}%`}
        >
          <i style={{ width: `${actualPercent}%` }} />
        </div>
      </section>

      <section className={`pace ${gap < 0 ? "behind" : "ahead"}`}>
        <div>
          <span>{text.ideal}</span>
          <b>{idealPercent}%</b>
        </div>
        <strong>{gapText}</strong>
      </section>

      <div className="actions">
        <button onClick={() => setCompleted((value) => Math.max(0, value - 1))}>
          {text.minusPage}
        </button>
        <button
          className="primary"
          onClick={() => setCompleted((value) => Math.min(total, value + 1))}
        >
          {text.plusPage}
        </button>
      </div>

      <footer>
        <span>
          <i />
          {text.synced}
        </span>
        <button type="button" disabled>
          {text.import}
        </button>
        <button type="button" disabled>
          {text.sync}
        </button>
      </footer>
    </article>
  );
}

export function App() {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("mangasprint-demo-language");
    return saved === "zh" ? "zh" : "en";
  });
  const text = copy[language];

  useEffect(() => {
    localStorage.setItem("mangasprint-demo-language", language);
    document.documentElement.lang = language === "en" ? "en" : "zh-Hant";
    document.title =
      language === "en"
        ? "MangaSprint | Interactive Web Demo"
        : "MangaSprint｜線上互動 Demo";
    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute(
      "content",
      language === "en"
        ? "Try MangaSprint, an interactive Windows progress widget for manga creators."
        : "匿名體驗 MangaSprint Windows 漫畫製作進度 Widget 的展開、縮小與頁數追蹤操作。",
    );
  }, [language]);

  return (
    <main>
      <nav>
        <a className="brand" href={REPOSITORY_URL}>
          MangaSprint
        </a>
        <div className="nav-actions">
          <a href="#how-it-works">{text.navFeatures}</a>
          <a className="nav-download" href={RELEASE_URL}>
            {text.download}
          </a>
          <div className="language-switch" aria-label="Language">
            <button
              className={language === "en" ? "active" : ""}
              onClick={() => setLanguage("en")}
              aria-pressed={language === "en"}
            >
              EN
            </button>
            <span>/</span>
            <button
              className={language === "zh" ? "active" : ""}
              onClick={() => setLanguage("zh")}
              aria-pressed={language === "zh"}
            >
              中文
            </button>
          </div>
        </div>
      </nav>

      <section className="intro">
        <div className="copy">
          <span className="pill">{text.badge}</span>
          <h1>
            {text.headline}
            <br />
            <em>{text.headlineAccent}</em>
          </h1>
          <p>{text.intro}</p>
          <div className="cta-row">
            <a className="cta" href={RELEASE_URL}>
              {text.download}
            </a>
            <a className="text-link" href={REPOSITORY_URL}>
              {text.manual}
            </a>
          </div>
          <small>{text.reassurance}</small>
        </div>

        <div className="stage">
          <div className="screen-label">
            <span />
            {text.interactive}
          </div>
          <DemoWidget language={language} />
          <p>{text.hint}</p>
        </div>
      </section>

      <section className="features" id="how-it-works">
        <article>
          <span>01</span>
          <h2>{text.featureOneTitle}</h2>
          <p>{text.featureOne}</p>
        </article>
        <article>
          <span>02</span>
          <h2>{text.featureTwoTitle}</h2>
          <p>{text.featureTwo}</p>
        </article>
        <article>
          <span>03</span>
          <h2>{text.featureThreeTitle}</h2>
          <p>{text.featureThree}</p>
        </article>
      </section>

      <section className="desktop-note">
        <div>
          <span>{text.differenceLabel}</span>
          <h2>{text.differenceTitle}</h2>
        </div>
        <p>{text.difference}</p>
      </section>

      <footer className="site-footer">
        <strong>MangaSprint</strong>
        <span>{text.footer}</span>
        <a href={REPOSITORY_URL}>GitHub</a>
      </footer>
    </main>
  );
}
