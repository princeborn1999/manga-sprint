# MangaSprint

MangaSprint 是完全在本機運作的 Windows 漫畫製作進度 Widget。按一次「＋1 頁」便會先把進度保存到 `electron-store`，更新當日歷史，再嘗試同步人類可讀的 Excel；即使 Excel 正被 Microsoft Excel 鎖定，實際進度仍保留為待同步。

## MVP 功能

- 420 × 500 透明無框 Widget、永遠置頂、位置記憶、位置鎖定、透明度調整
- `＋1 頁`、`−1`、跨話進度、累計實際／理想頁數及超前／落後狀態
- 單一執行個體、系統匣、隱藏而不退出、Windows 登入時啟動
- 建立新專案及 MangaSprint Excel
- 唯讀匯入舊 `.xlsx`、解析 `chXX...%` 格式、補齊總頁數後建立新檔
- Chapters、DailyPlan、DailyHistory、Settings 四個 Excel 工作表
- 同資料夾臨時檔、重新讀取驗證、正式檔替換、30 天備份保留
- Excel 鎖檔時保存 pending sync，之後可由 Widget 或系統匣再次同步
- Main／Preload／Renderer 分層，Renderer 無 Node.js 權限

## 技術架構

- Electron + electron-vite
- React + TypeScript + Zustand
- SheetJS (`xlsx`)
- electron-store
- electron-builder（NSIS x64）
- Vitest、React Testing Library、ESLint、Prettier

資料流：

```text
React Renderer
  → contextBridge 白名單 API
  → ipcRenderer.invoke（固定 channel）
  → Electron Main 輸入驗證
  → electron-store 即時保存
  → Excel 臨時檔／驗證／替換
  → 型別化結果回到 UI
```

`BrowserWindow` 使用 `contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`。Renderer 不使用 `fs`、`path`、`child_process`、Electron Main API、遠端網頁、shell 或 `eval`。

## 專案結構

```text
src/
  main/
    excel/       Excel 建立、匯入、備份、原子替換
    ipc/         白名單 IPC handlers 與輸入驗證
    services/    進度與每日歷史服務
    storage/     electron-store
    tray/        Windows 系統匣
    windows/     Widget 與設定視窗
  preload/       contextBridge API 與型別
  renderer/
    components/  Widget
    dialogs/     建立與匯入流程
    hooks/       跨話進度
    pages/       設定頁
    stores/      Zustand
    styles/
  shared/
    calculations/
    constants/
    date/
    types/
    validation/
tests/
  calculations/
  date/
  excel/
examples/
  legacy-vol2.xlsx
  mangasprint-sample.xlsx
```

## 開發環境

建議 Windows 10/11 x64、Node.js 22 LTS。此工作區以 Node.js 20 完成建置，但最新版 Electron 打包子工具會提示 Node.js 22 engine 建議。開發不需要 Rust、Visual Studio C++ toolchain、資料庫或後端伺服器。

```powershell
npm install
npm run dev
```

`npm run dev` 會啟動 electron-vite 與 Electron。正式版只載入打包進 `out/renderer` 的本機頁面。

## 驗證

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
```

測試涵蓋累計頁數、進度差、百分比、跨話 ±1、本機日期、Excel 工作表結構及舊檔 fixture 匯入。

## Windows 打包

```powershell
npm run dist:win
```

輸出位於：

```text
release/MangaSprint-0.1.0-x64.exe
```

這是 NSIS x64 安裝程式，可選安裝位置，並建立桌面與開始功能表捷徑。解除安裝預設保留使用者資料，避免誤刪尚未同步進度。

目前未提供正式品牌 icon，electron-builder 會使用 Electron 預設圖示。發佈前請加入至少 256 × 256 的 Windows `.ico`，並在 `package.json > build.win.icon` 指定。

目前安裝程式沒有商用程式碼簽章；Windows SmartScreen 可能顯示未知發行者。正式公開發佈前應配置可信任的 Windows code-signing certificate。

## 第一次使用

1. 啟動 App，按「新建」。
2. 填寫專案名稱、話數、標題、總頁數、開始日及目標日。
3. 選擇 `.xlsx` 儲存位置。
4. 每完成一頁按「＋1 頁」。
5. 設定視窗可調整透明度、置頂、位置鎖定及開機啟動。

預設範例專案為 MangaSprint Vol.2，包含 Chapter 11（18 頁）、Chapter 12（18 頁）、Chapter 13（20 頁）。

## 匯入 vol2.xlsx

1. 按「匯入」並選擇 `vol2.xlsx`。
2. 匯入器只讀取原始檔，不會覆寫或另存原檔。
3. 支援 `ch11.完稿進度%`、百分比數值 `0.5`、數字 `50`、文字 `"50%"`，以及 Excel／JS／文字日期。
4. 補填每話總頁數。
5. App 在原檔同資料夾建立 `vol2-MangaSprint.xlsx`。

可用 [舊檔 fixture](examples/legacy-vol2.xlsx) 測試匯入；[新版 fixture](examples/mangasprint-sample.xlsx) 展示正式四工作表結構。

## Excel 同步與備份

每次進度操作的順序：

1. 驗證 chapter、page 與日期。
2. 寫入 electron-store，標記 pending sync。
3. 更新今日唯一一筆 DailyHistory。
4. 在正式檔旁的 `backups` 建立時間戳備份。
5. 寫入同資料夾臨時 `.xlsx`。
6. 重新讀取臨時檔並確認四個必要工作表。
7. 替換正式檔；若失敗，還原原檔並保留待同步狀態。

備份預設保留 30 天。程式不修改匯入來源 `vol2.xlsx`。

## 已知限制

- 舊 Excel 版型差異很大；MVP 支援 `chXX...%` 及一般列式格式，但沒有互動式欄位映射器。
- SheetJS 社群版建立的新檔包含資料、欄寬與 AutoFilter，但不複製舊檔巨集、圖表、進階條件格式或原樣式。
- 系統匣目前使用內建極簡圖像；正式品牌 icon 尚待替換。
- 安裝程式未簽章，公開散布時可能觸發 Windows SmartScreen。
- App 內沒有完整的話數編輯／重排頁面；建立專案後主要聚焦每日進度。
- 備份依檔案修改時間清理，沒有 UI 可調整保留天數。
- npm audit 可能回報來自打包工具鏈或 SheetJS 的相依性公告；發佈前應逐項評估，不應直接使用破壞性 `npm audit fix --force`。
