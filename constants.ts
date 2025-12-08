import { TTSSettings } from "./types";

export const DEFAULT_SETTINGS: TTSSettings = {
  rate: 0.9, // Slightly slower default for better clarity/emotion
  pitch: 1,
  volume: 1,
};

export const DEFAULT_TEXT = "Welcome to NativeSpeak.\nThis app runs entirely on your device with no internet required. The engine adds natural pauses between sentences.\n\n歡迎使用 NativeSpeak。\n這個應用程式完全在您的手機上運行，無需網路。我們對語音引擎進行了優化，讓它在念出「問句？」或是「驚嘆句！」的時候，能稍微帶點感情。\n\nNativeSpeakへようこそ。\nこのアプリは、インターネット接続なしで完全にデバイス上で動作します。文脈に合わせて、より自然な抑揚で読み上げます。";