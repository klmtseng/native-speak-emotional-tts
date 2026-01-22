
import { TTSSettings } from "./types";

export const DEFAULT_SETTINGS: TTSSettings = {
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
};

export const DEFAULT_TEXT = `NativeSpeak v1.3.3 Release (2026-01-22)

🎉 What's New / 更新重點：

1. Context-Aware Cantonese (智慧廣東話) 🇭🇰
   The engine now intelligently handles mixed content.
   系統現在能更聰明地處理混合內容：
   
   "這是標準的中文句子。" (Standard Chinese)
   "但在這裏，它會被周圍的廣東話同化。" (Context Awareness)
   "係呀，因為前後都係廣東話，中間呢句都會變廣東話讀出嚟！"

2. Smart Polyglot (智慧語系切換)
   "Welcome! 這是 NativeSpeak 的最新版本。
    日本語のテキストも、自動的に検出して読み上げます。"

3. Privacy First (隱私優先)
   Still 100% offline. No data leaves your device.
   
(Click Play to test the polyglot engine / 按下播放測試多語系引擎)`;
