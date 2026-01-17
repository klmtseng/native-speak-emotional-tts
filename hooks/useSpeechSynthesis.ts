
import { useState, useEffect, useCallback, useRef } from 'react';
import { TTSSettings, TTSState } from '../types';

interface UtteranceSegment {
  text: string;
  offset: number;
}

export const useSpeechSynthesis = () => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [ttsState, setTtsState] = useState<TTSState>({
    isSpeaking: false,
    isPaused: false,
    currentWord: '',
    charIndex: -1,
  });
  
  const synth = useRef<SpeechSynthesis>(window.speechSynthesis);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const segmentsRef = useRef<UtteranceSegment[]>([]);
  
  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = synth.current.getVoices();
      
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
        
        if (!selectedVoice) {
            // Priority: Meijia -> Default -> Local Service -> First available
            const meijiaVoice = availableVoices.find(v => v.name.toLowerCase().includes('meijia'));

            const defaultVoice = 
                meijiaVoice ||
                availableVoices.find(v => v.default) || 
                availableVoices.find(v => v.localService) ||
                availableVoices[0];
            setSelectedVoice(defaultVoice);
        }
      }
    };

    loadVoices();
    
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [selectedVoice]);

  // Lifecycle cleanup
  useEffect(() => {
    return () => {
      synth.current.cancel();
    };
  }, []);

  /**
   * Helper: Parse text.
   * FIX: Filter out segments that are just punctuation to prevent TTS engine stalling.
   */
  const parseTextToSegments = (fullText: string): UtteranceSegment[] => {
    const segments: UtteranceSegment[] = [];
    // Split by major punctuation but capture it
    const regex = /([^.!?。！？\n\r]+[.!?。！？\n\r]*)|([.!?。！？\n\r]+)/g;
    
    let match;
    while ((match = regex.exec(fullText)) !== null) {
      const text = match[0];
      
      // CRITICAL FIX: Only add segments that contain at least one alphanumeric or CJK character.
      // Pure punctuation segments (like "...") often fail to trigger 'onend' events in some browsers.
      // We check for letters, numbers, or non-ascii characters (like CJK).
      const hasContent = /[a-zA-Z0-9\u00C0-\u00FF\u3000-\u9FFF]/.test(text);

      if (hasContent) {
        segments.push({ text, offset: match.index });
      }
    }
    
    // Fallback
    if (segments.length === 0 && fullText.trim().length > 0) {
      segments.push({ text: fullText, offset: 0 });
    }
    
    return segments;
  };

  /**
   * Helper: Detect Language
   */
  const detectBestVoiceForText = (text: string, currentVoice: SpeechSynthesisVoice | null, availableVoices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
    if (availableVoices.length === 0) return currentVoice;
    
    const sample = text.slice(0, 100);

    // 1. Japanese
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(sample)) {
       if (currentVoice?.lang.includes('ja')) return currentVoice;
       return availableVoices.find(v => v.lang.includes('ja')) || currentVoice;
    }

    // 2. Chinese
    if (/[\u4E00-\u9FFF]/.test(sample)) {
        if (currentVoice?.lang.includes('zh') || currentVoice?.lang.includes('cmn')) return currentVoice;
        
        // If current voice is not Chinese, try to find Meijia first for Chinese text
        const meijia = availableVoices.find(v => v.name.toLowerCase().includes('meijia'));
        if (meijia) return meijia;

        return availableVoices.find(v => v.lang.includes('zh') || v.lang.includes('cmn')) || currentVoice;
    }

    return currentVoice;
  };

  /**
   * Play Segment
   */
  const playSegment = (index: number, settings: TTSSettings, voice: SpeechSynthesisVoice | null) => {
    // End of queue check
    if (index >= segmentsRef.current.length) {
      setTtsState(prev => ({ ...prev, isSpeaking: false, isPaused: false, charIndex: -1 }));
      activeUtteranceRef.current = null;
      return;
    }

    const segment = segmentsRef.current[index];
    const utterance = new SpeechSynthesisUtterance(segment.text);

    // Voice & Lang
    if (voice) {
      utterance.voice = voice;
      // Some browsers require explicit lang matching
      utterance.lang = voice.lang; 
    }

    // Settings
    // FIX: Removed dynamic pitch/rate adjustments based on punctuation.
    // Some engines (Samsung/iOS) crash or go silent if pitch is modified per-sentence.
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;
    utterance.volume = settings.volume;

    // Events
    utterance.onstart = () => {
      setTtsState(prev => ({ 
        ...prev, 
        isSpeaking: true, 
        isPaused: false,
        charIndex: segment.offset 
      }));
    };

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
         const globalIndex = segment.offset + event.charIndex;
         setTtsState(prev => ({ ...prev, charIndex: globalIndex }));
      }
    };

    const playNext = () => {
        // Ensure we only proceed if this was the active utterance
        if (activeUtteranceRef.current === utterance) {
            playSegment(index + 1, settings, voice);
        }
    };

    utterance.onend = () => {
      // 0ms delay to clear call stack but keep it snappy
      setTimeout(playNext, 0); 
    };

    utterance.onerror = (e) => {
      console.warn("TTS Segment Error:", e);
      // Attempt to recover by skipping to next
      setTimeout(playNext, 0);
    };

    // FIX for Safari/iOS:
    // Explicitly attach to window object to prevent Garbage Collection during playback.
    // Using a typed property on window would require type merging, so we cast to any.
    (window as any)._activeTTSUtterance = utterance;
    activeUtteranceRef.current = utterance;
    
    synth.current.speak(utterance);
  };

  const speak = useCallback((text: string, settings: TTSSettings) => {
    synth.current.cancel();
    
    if (!text.trim()) return;

    // Get fresh voices
    const currentVoices = voices.length > 0 ? voices : synth.current.getVoices();
    let targetVoice = selectedVoice;
    
    // Auto-detection
    const bestVoice = detectBestVoiceForText(text, selectedVoice, currentVoices);
    if (bestVoice && bestVoice !== selectedVoice) {
        setSelectedVoice(bestVoice);
        targetVoice = bestVoice;
    }

    // Parse
    segmentsRef.current = parseTextToSegments(text);
    
    // Start
    if (segmentsRef.current.length > 0) {
        playSegment(0, settings, targetVoice);
    }

  }, [selectedVoice, voices]);

  const pause = useCallback(() => {
    if (synth.current.speaking && !synth.current.paused) {
      synth.current.pause();
      setTtsState(prev => ({ ...prev, isPaused: true }));
    }
  }, []);

  const resume = useCallback(() => {
    if (synth.current.paused) {
      synth.current.resume();
      setTtsState(prev => ({ ...prev, isPaused: false }));
    }
  }, []);

  const cancel = useCallback(() => {
    synth.current.cancel();
    activeUtteranceRef.current = null;
    (window as any)._activeTTSUtterance = null;
    segmentsRef.current = [];
    setTtsState({
      isSpeaking: false,
      isPaused: false,
      currentWord: '',
      charIndex: -1
    });
  }, []);

  return {
    voices,
    selectedVoice,
    setSelectedVoice,
    speak,
    pause,
    resume,
    cancel,
    ttsState
  };
};
