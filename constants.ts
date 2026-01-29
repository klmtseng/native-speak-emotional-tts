
import { TTSSettings } from "./types";

export const DEFAULT_SETTINGS: TTSSettings = {
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
};

export const DEFAULT_TEXT = `NativeSpeak v1.3.6 Release (2026-01-30)

✨ Latest Polish / 最新優化內容：

1. Smart Segmentation (智慧分詞修復) ✂️
   "No more stuttering on versions like v1.3.6 or URLs like google.com."
   "修正了版本號與網址被錯誤切分的問題，朗讀節奏更自然。"

2. Negative Numbers (負數支援) ➖
   "It's freezing! The temperature is -5°C."
   "現在負號 (-) 不會被當作連字號過濾掉，系統能正確讀出「負五度」。"

3. Visual Stability (介面穩定性) 📐
   "Fixed highlight misalignment caused by scrollbars."
   "強制對齊高亮層與文字層的滾動條空間，解決了長時間朗讀時的視覺錯位。"

4. Smart Dates (智慧日期) 📅
   "2026-01-30"
   "中文/粵語/日文模式下，2026-01-30 會被讀作「2026年1月30日」。"

(Click Play to test / 按下播放測試)`;
