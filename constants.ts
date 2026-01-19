
import { TTSSettings } from "./types";

export const DEFAULT_SETTINGS: TTSSettings = {
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
};

export const DEFAULT_TEXT = `NativeSpeak v1.3.1 Release (2026-01-19)

🎉 What's New / 更新重點：

1. Smart Polyglot (智慧語系切換)
   The engine now adapts to mixed languages instantly.
   現在支援混合語言朗讀，請試聽以下範例：
   
   "Hello! 這是 NativeSpeak 的最新版本。
    日本語のテキストも、自動的に検出して読み上げます。
    So you don't have to switch voices manually anymore!"

2. Drag & Drop Support (拖曳支援)
   You can now drop .txt, .md, or .srt files directly here.
   試著把字幕檔或筆記拖進來看看吧！

3. Privacy First (隱私優先)
   Still 100% offline. No data leaves your device.
   
(Click Play to test the polyglot engine / 按下播放測試多語系引擎)`;
