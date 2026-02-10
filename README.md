# NativeSpeak Emotional TTS

NativeSpeak 是一個以 **React + Vite** 開發的前端文字轉語音（TTS）應用，核心使用瀏覽器原生 **Web Speech API (`window.speechSynthesis`)**，主打本機處理與即時朗讀體驗。

## 專案目標

- 提供簡潔、可即時操作的 TTS 播放介面。
- 支援中／英／日混合文本朗讀與語音切換。
- 支援匯入與拖放文字檔案，快速開始朗讀。
- 透過在地 API 完成語音合成，不依賴雲端 TTS 服務。

## 主要功能

- **語音播放控制**：播放、暫停、繼續、停止。
- **語音選擇與篩選**：依語系篩選（All / English / Mandarin / Cantonese / Japanese）。
- **朗讀參數調整**：語速（rate）、音高（pitch）、音量（volume）。
- **文字高亮跟讀**：播放時依 `charIndex` 在編輯區進行高亮提示。
- **檔案匯入**：支援檔案按鈕上傳與拖放。
- **格式清洗**：針對 `.md`、`.srt` 等格式做基礎內容清理，提升朗讀流暢度。
- **版本日誌（Changelog）**：可在 UI 內查看更新紀錄。

## 技術堆疊

- **Runtime**: Node.js
- **Framework**: React 19
- **Build Tool**: Vite 6
- **Language**: TypeScript
- **Icons**: lucide-react

## 快速開始

### 1) 安裝依賴

```bash
npm install
```

### 2) 啟動開發伺服器

```bash
npm run dev
```

預設會啟動在 `http://localhost:3000`。

### 3) 建置正式版本

```bash
npm run build
```

### 4) 預覽建置結果

```bash
npm run preview
```

## 檔案匯入支援

- 介面按鈕接受：`.txt`, `.md`, `.srt`, `.vtt`
- 拖放區另外放寬接受部分程式或 JSON 純文字副檔名（由前端檢查副檔名）

> 實際可朗讀內容仍取決於檔案文字本身與瀏覽器語音引擎能力。

## 專案結構（精簡）

```text
.
├── App.tsx                       # 主畫面與流程整合
├── components/
│   ├── TextInput.tsx             # 編輯區、拖放與高亮
│   ├── VoiceSelector.tsx         # 語音選單與語系篩選
│   ├── SettingsPanel.tsx         # rate/pitch/volume 控制
│   └── ChangelogModal.tsx        # 版本日誌
├── hooks/
│   └── useSpeechSynthesis.ts     # 核心 TTS 邏輯與語音切換
├── constants.ts                  # 預設朗讀參數與預設文字
├── types.ts                      # 型別定義
├── index.tsx                     # React 入口
└── vite.config.ts                # Vite 設定
```

## 已知限制

- 不同瀏覽器／作業系統的可用語音數量差異很大。
- 某些環境可能存在 `speechSynthesis` 但無可用 voices（例如部分容器化或精簡系統環境）。
- 語音性別判斷屬啟發式（heuristic），實際效果取決於作業系統語音包命名。

## 隱私與資料處理

- 語音播放使用瀏覽器內建 TTS 引擎。
- 專案本身不包含把文字送往雲端 TTS 服務的流程。
- 使用者匯入與輸入的內容主要在本機瀏覽器端處理。

## NPM Scripts

- `npm run dev`：啟動開發模式
- `npm run build`：建置正式版
- `npm run preview`：預覽建置結果

---

如果你希望，我也可以再幫你補一版英文 README（`README.en.md`）供開源或對外協作使用。
