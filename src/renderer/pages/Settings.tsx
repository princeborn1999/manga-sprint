import { useAppStore } from "../stores/app";

export function Settings() {
  const { state, busy, updateSettings, setAlwaysOnTop, setLaunchAtStartup } = useAppStore();
  if (!state) return <main className="settings-page">載入設定…</main>;
  const settings = state.settings;
  return <main className="settings-page">
    <header><div><small>MANGASPRINT</small><h1>設定</h1></div></header>
    <section>
      <label>專案名稱<input value={settings.projectName} onChange={(e) => void updateSettings({ projectName: e.target.value })} /></label>
      <label>透明度 <output>{Math.round(settings.opacity * 100)}%</output><input type="range" min=".5" max="1" step=".05" value={settings.opacity} onChange={(e) => void updateSettings({ opacity: Number(e.target.value) })} /></label>
      <label className="toggle"><input type="checkbox" checked={settings.alwaysOnTop} onChange={(e) => void setAlwaysOnTop(e.target.checked)} />永遠置頂</label>
      <label className="toggle"><input type="checkbox" checked={settings.lockWindowPosition} onChange={(e) => void updateSettings({ lockWindowPosition: e.target.checked })} />鎖定 Widget 位置</label>
      <label>停靠位置
        <select value={settings.dockPosition} onChange={(e) => void updateSettings({ dockPosition: e.target.value as typeof settings.dockPosition })}>
          <option value="top-center">上方正中</option>
          <option value="top-right">右上角</option>
          <option value="top-free">上方自由滑動</option>
          <option value="right-center">右側中央</option>
          <option value="free">自由位置</option>
        </select>
      </label>
      <label className="toggle"><input type="checkbox" checked={settings.launchAtStartup} onChange={(e) => void setLaunchAtStartup(e.target.checked)} />Windows 登入時啟動</label>
    </section>
    <section>
      <h2>Excel</h2>
      <p className="path">{settings.excelFilePath || "尚未建立 Excel"}</p>
      <div className="row"><button disabled={busy || !settings.excelFilePath} onClick={() => void useAppStore.getState().sync()}>立即同步</button><button disabled={!settings.excelFilePath} onClick={() => void window.mangaSprint.createBackup()}>建立備份</button></div>
      <p>同步狀態：{settings.hasPendingSync ? "進度已保存在 App，等待寫入 Excel" : "已同步至 Excel"}</p>
    </section>
    <section>
      <h2>安全與資料</h2>
      <p>資料即時保存在本機設定檔；Excel 是長期可讀紀錄。Excel 被鎖定時不會丟失進度，下次可再次同步。</p>
    </section>
  </main>;
}
