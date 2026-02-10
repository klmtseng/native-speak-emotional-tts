import { TTSSettings } from "./types";

export const DEFAULT_SETTINGS: TTSSettings = {
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
};

export const DEFAULT_TEXT = `NativeSpeak v1.3.9 Release (2026-02-10)

✨ 最新說明 / Updated Notes：

1. Cross-Browser QA Validation (跨瀏覽器驗證) 🌐
   "Completed smoke tests on Chromium, Firefox, and WebKit."
   "已完成 Chromium、Firefox、WebKit 的基本流程驗證（載入、匯入、拖放）。"

2. Playback Behavior Note (播放行為說明) 🔊
   "Voice availability depends on browser and OS."
   "語音可用數量會依瀏覽器與作業系統而不同；若沒有 voices，播放可能不會啟動。"

3. Import Experience (匯入體驗) 📂
   "You can paste text, upload a file, or drag and drop directly."
   "可直接貼上文字、按按鈕匯入檔案，或拖放檔案到輸入區。"

4. Supported Formats (支援格式) 📝
   "Supports .txt, .md, .srt, .vtt"
   "目前支援 .txt、.md、.srt、.vtt。"

(Replace this text with your own content / 你可以直接刪除此說明並貼上要朗讀的內容)`;
