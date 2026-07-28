# MangaSprint

MangaSprint 是一個本機單人使用的 Windows 漫畫製作進度 Widget。它會依照每話起訖日期計算今天的理想進度，讓你用 `＋1 頁`、`−1 頁` 快速更新實際完成頁數，並將紀錄安全同步到 Excel。

![MangaSprint 展開畫面](docs/images/widget-expanded.png)

> 文件截圖使用示範資料，不包含使用者私人檔案或實際路徑。

## 主要功能

- 固定在螢幕頂端的無邊框 Widget。
- 展開與縮小模式，縮小後仍可左右拖曳位置。
- 依工作日期計算目前理想進度及相差頁數。
- 快速增加或減少實際完成頁數。
- 畫到一半可直接增加或刪除該話總頁數。
- 拖放或選擇 `.xlsx` 匯入。
- App 狀態即時保存在本機，Excel 被鎖定時不會遺失進度。
- 自動同步及手動同步 Excel。
- Excel 寫入前建立備份、使用臨時檔驗證，再替換正式檔案。
- 系統匣、永遠置頂、透明度及開機啟動設定。

## 系統需求

- Windows 10 或 Windows 11 x64。
- 安裝版已包含 Electron，不需要另外安裝 Node.js、Rust、Tauri 或 WebView2。
- App 本身不需要 Microsoft Excel；只有在你想人工查看或編輯 `.xlsx` 時才需要 Excel 或其他相容軟體。

## 安裝

執行 Windows x64 安裝程式：

```text
MangaSprint-0.1.0-x64.exe
```

目前安裝程式沒有商業程式碼簽章，Windows SmartScreen 可能顯示警告。請確認檔案來源可信，再選擇「其他資訊」→「仍要執行」。

安裝完成後可以從桌面捷徑或開始功能表開啟 MangaSprint。

## 第一次使用：匯入 Excel

1. 開啟 MangaSprint。
2. 將 `.xlsx` 拖進 Widget，或按「匯入 Excel」。
3. 確認辨識出的話數範圍及目前進度。
4. 預設每話總頁數為 18；匯入後仍可逐話加頁或刪頁。
5. 按「匯入並建立」。

![Excel 匯入確認](docs/images/excel-import.png)

舊式橫向 Excel 不會被修改。程式會讀取資料後，在相同資料夾建立新的 MangaSprint Excel：

```text
原檔名-MangaSprint.xlsx
```

支援的橫向格式是每話三欄：

```text
第幾話理想完成% | 實際完成% | 日期
```

程式也能重新匯入自己產生的 MangaSprint Excel，並保留：

- 每話總頁數。
- 實際完成頁數。
- 話數起訖日期。
- 完成狀態。

## Widget 操作

### 更新實際完成頁數

- `＋1 頁`：實際完成頁數增加一頁。
- `−1 頁`：實際完成頁數減少一頁。
- 百分比、相差頁數及當日紀錄會立即重新計算。

### 中途增加或刪除總頁數

話數總頁數旁有小型 `−`、`＋` 按鈕：

- 增加總頁數時，已完成頁數保持不變。
- 刪除總頁數時，只要新總頁數仍高於已完成頁數，完成頁數保持不變。
- 如果新總頁數低於已完成頁數，App 會先要求確認。
- 確認後，已完成頁數會一起縮減到新的總頁數，代表實際刪除了已完成頁面。
- 理想排程會依新總頁數重新分配。

例如：

```text
6 / 18 → 增加總頁數 → 6 / 20
16 / 18 → 總頁數改為 14 → 確認刪頁 → 14 / 14
```

### 理想進度與相差頁數

- 「理想進度」是依目前日期及該話工作期間計算出的目標百分比。
- `−6 頁` 代表目前落後理想進度 6 頁。
- `＋2 頁` 代表目前領先理想進度 2 頁。

## 縮小、展開及移動

按 Widget 最上方的 `⌃` 可以縮小。

![MangaSprint 縮小畫面](docs/images/widget-collapsed.png)

- 縮小後只顯示目前話數及頁數。
- 點擊縮小列即可展開。
- 按住縮小列文字附近左右拖曳，可以沿著螢幕頂端移動。
- 垂直位置會固定在螢幕最上方，不會被往下拖動。
- 縮小區域以外不會擋住後方視窗點擊。

## 「同步」是什麼？

同步是把 App 本機 Store 中的最新狀態寫入 MangaSprint Excel。

每次修改進度或總頁數時：

1. App 先立即保存到本機 Store。
2. 將狀態標記為「待寫入 Excel」。
3. 在背景自動嘗試同步。
4. 成功後顯示「已同步」。

平常不需要每次手動按「同步」。手動同步主要用於：

- Excel 原本開著，導致檔案被鎖定。
- 上一次背景寫入失敗。
- 想在關閉 App 或複製檔案前確認 Excel 已是最新狀態。

同步寫入流程：

1. 驗證話數、頁數及日期。
2. 本機 Store 保留最新狀態。
3. 備份現有 MangaSprint Excel。
4. 在相同資料夾寫入臨時 `.xlsx`。
5. 重新讀取臨時檔確認有效。
6. 成功後才替換正式 Excel。
7. 失敗時保留「待寫入」狀態，App 進度不會消失。

## 本機快取與重新開啟

MangaSprint 使用 `electron-store` 保存即時狀態。

- 每次操作會先保存到 Store。
- 關閉或重新啟動後，會從 Store 恢復上次狀態。
- 啟動時不會每次重新解析 Excel。
- Excel 是正式的人類可讀紀錄及額外備份。
- 如果上次尚未寫入 Excel，重新開啟後仍會顯示「待寫入 Excel」。

視窗的關閉按鈕預設只會隱藏到系統匣。要完全關閉，請使用系統匣選單的「結束程式」。

## 設定

![MangaSprint 設定與同步](docs/images/settings-sync.png)

設定頁提供：

- 永遠置頂。
- 開機啟動。
- Widget 透明度。
- 停靠位置。
- 立即同步。
- 手動建立 Excel 備份。
- 目前 Excel 路徑及同步狀態。

## 換到另一台電腦

### 還沒開始使用 MangaSprint

1. 複製安裝檔及原始排程 Excel 到新電腦。
2. 安裝 MangaSprint。
3. 匯入原始 Excel。
4. 確認預設總頁數後開始使用。

### 已經使用一段時間，要連進度一起搬移

1. 在舊電腦關閉 Excel。
2. 確認 MangaSprint 顯示「已同步」；若不是，按一次「同步」。
3. 完全結束 MangaSprint。
4. 複製最新的 `*-MangaSprint.xlsx` 到新電腦。
5. 在新電腦安裝 MangaSprint。
6. 匯入這份 MangaSprint Excel。

每話總頁數與實際完成頁數會保留。視窗位置、透明度及開機啟動屬於每台電腦的本機設定，需要在新電腦重新設定。

不要讓兩台電腦同時修改各自的 Excel；目前沒有雲端合併功能。

## 開發

### 技術架構

- Electron
- React
- TypeScript
- Vite / electron-vite
- Zustand
- SheetJS (`xlsx`)
- electron-store
- Vitest
- ESLint / Prettier
- NSIS Windows x64 installer

### 安裝依賴並啟動

```powershell
npm install
npm run dev
```

### 驗證

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
```

### 建立 Windows 安裝檔

```powershell
npm run dist:win
```

輸出位置：

```text
release/MangaSprint-0.1.0-x64.exe
```

## 專案結構

```text
src/
  main/
    excel/       Excel 匯入、備份、驗證及原子替換
    ipc/         型別化 IPC handlers
    services/    進度及總頁數更新
    storage/     electron-store
    tray/        系統匣
    windows/     Widget 視窗及拖曳
  preload/       安全 contextBridge API
  renderer/
    components/  Widget
    dialogs/     匯入確認
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
docs/images/
examples/
```

## 安全設計

- `contextIsolation: true`
- `nodeIntegration: false`
- Renderer sandbox
- Renderer 不直接讀寫任意本機檔案
- Excel 路徑由原生選檔器或拖放取得
- Main process 驗證檔案、副檔名、話數、頁數及日期
- 不執行任意 shell 指令
- 不載入遠端網頁
- 不使用雲端資料庫、登入或付費 API

## 已知限制

- 僅支援 Windows x64。
- 安裝程式目前沒有程式碼簽章，可能觸發 SmartScreen。
- 沒有雲端同步或多電腦衝突合併。
- 匯入 MangaSprint Excel 時會恢復話數、總頁數、實際進度及日期，但不會搬移視窗位置等本機設定。
- Excel 的複雜舊格式不會原樣保留；舊檔只讀，程式會建立自己的新版工作簿。
- 請只匯入來源可信的 `.xlsx`。
