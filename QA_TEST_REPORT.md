# QA Test Report

Date: 2026-02-10
Scope: Runtime smoke tests for voice playback state, file import, drag-and-drop import, and cross-browser behavior.

## Commands / tools used
- `npm run build`
- `npm run dev -- --host 0.0.0.0 --port 3000`
- Playwright browser_container script across Chromium, Firefox, and WebKit.

## Results

### 1) Build
- PASS: Production build succeeds.

### 2) Cross-browser runtime checks
Browsers tested:
- Chromium
- Firefox
- WebKit

Checks executed per browser:
- App loads and header title is visible (`NativeSpeak`).
- `window.speechSynthesis` exists.
- Play button click changes runtime state (checked via aria label after click).
- Hidden file input import with Markdown sample.
- Drag-and-drop import with SRT sample.

Observed outcomes:
- All three browsers loaded app and passed file import + drag/drop checks.
- Markdown import cleaning result: `Hello\n\nWorld and link`.
- SRT drag/drop cleaning result: `Hi there`.
- Speech synthesis voices availability differs by browser in this environment:
  - Chromium: 0 voices
  - Firefox: 0 voices
  - WebKit: 4 voices
- Play button state after click:
  - Chromium/Firefox remained `Play` (consistent with zero-voice environment, no active playback).
  - WebKit switched to `Pause` (playback started).

## Artifacts
- `webkit-qa.png`
- `chromium-qa.png`
- `firefox-qa.png`

## Conclusion
- Core UI flows (load, import, drag/drop) are functioning normally across tested engines.
- Actual audible playback is environment-dependent due to browser voice availability.
