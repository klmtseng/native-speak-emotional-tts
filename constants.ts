
import { TTSSettings } from "./types";

export const DEFAULT_SETTINGS: TTSSettings = {
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
};

export const DEFAULT_TEXT = `NativeSpeak v1.3.8 Release (2026-01-31)

✨ Latest Polish / 最新優化內容：

1. Taiwan First (台灣優先) 🇹🇼
   "No more Mainland accent by default! The system now prioritizes Taiwan voices (Hanhan, Yating)."
   "不再預設中國口音！系統現在優先選用台灣口音（如 Hanhan, Yating, Meijia）。"

2. iOS Gender Fix (iOS 性別同步) 🧑‍🤝‍🧑
   "Now switching from Chinese to English on iPhone maintains the female voice correctly."
   "修復了 iOS 上切換語言時會變成男生聲音的問題。"

3. Smart Segmentation (智慧分詞修復) ✂️
   "No more stuttering on versions like v1.3.6 or URLs like google.com."
   "修正了版本號與網址被錯誤切分的問題，朗讀節奏更自然。"

4. Smart Dates (智慧日期) 📅
   "2026-01-31"
   "中文/粵語/日文模式下，2026-01-31 會被讀作「2026年1月31日」。"

(Click Play to test / 按下播放測試)`;
