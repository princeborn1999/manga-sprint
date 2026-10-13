import { useAppStore } from "../stores/app";

export function Settings() {
  const {
    workspace,
    busy,
    updateSettings,
    setAlwaysOnTop,
    setLaunchAtStartup,
  } = useAppStore();

  if (!workspace) return <main className="settings-page">載入設定…</main>;
  const settings = workspace.settings;

  return (
    <main className="settings-page">
      <header>
        <div>
          <small>MANGASPRINT</small>
          <h1>設定</h1>
        </div>
      </header>
      <section>
        <label>
          透明度 <output>{Math.round(settings.opacity * 100)}%</output>
          <input
            type="range"
            min=".5"
            max="1"
            step=".05"
            value={settings.opacity}
            onChange={(event) =>
              void updateSettings({ opacity: Number(event.target.value) })
            }
          />
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.alwaysOnTop}
            onChange={(event) => void setAlwaysOnTop(event.target.checked)}
          />
          永遠置頂
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.lockWindowPosition}
            onChange={(event) =>
              void updateSettings({ lockWindowPosition: event.target.checked })
            }
          />
          鎖定 Widget 位置
        </label>
        <label>
          停靠位置
          <select
            value={settings.dockPosition}
            onChange={(event) =>
              void updateSettings({
                dockPosition: event.target
                  .value as typeof settings.dockPosition,
              })
            }
          >
            <option value="top-center">上方正中</option>
            <option value="top-right">右上角</option>
            <option value="top-free">上方自由滑動</option>
            <option value="right-center">右側中央</option>
            <option value="free">自由位置</option>
          </select>
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.launchAtStartup}
            onChange={(event) => void setLaunchAtStartup(event.target.checked)}
          />
          Windows 登入時啟動
        </label>
      </section>
      <section>
        <h2>漫畫與 Excel</h2>
        <div className="project-settings-list">
          {workspace.projects.map((project) => {
            const projectSettings = project.state.settings;
            return (
              <article className="project-setting" key={project.id}>
                <h3>{projectSettings.projectName}</h3>
                <p className="path">
                  {projectSettings.excelFilePath || "尚未建立 Excel"}
                </p>
                <div className="row">
                  <button
                    disabled={busy || !projectSettings.excelFilePath}
                    onClick={() => void useAppStore.getState().sync(project.id)}
                  >
                    立即同步
                  </button>
                  <button
                    disabled={!projectSettings.excelFilePath}
                    onClick={() =>
                      void window.mangaSprint.createBackup(project.id)
                    }
                  >
                    建立備份
                  </button>
                </div>
                <p>
                  同步狀態：
                  {projectSettings.hasPendingSync
                    ? "進度已保存在 App，等待寫入 Excel"
                    : "已同步至 Excel"}
                </p>
              </article>
            );
          })}
        </div>
      </section>
      <section>
        <h2>安全與資料</h2>
        <p>
          每部漫畫的進度都會即時保存在本機設定檔，並分別同步至各自的
          Excel。Excel 被鎖定時不會丟失進度，下次可再次同步。
        </p>
      </section>
    </main>
  );
}
