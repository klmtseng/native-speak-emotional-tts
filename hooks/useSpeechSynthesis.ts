
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
  const userPreferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  
  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = synth.current.getVoices();
      
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
        
        if (!selectedVoice) {
            const meijiaVoice = availableVoices.find(v => v.name.toLowerCase().includes('meijia'));
            const defaultVoice = 
                meijiaVoice ||
                availableVoices.find(v => v.default) || 
                availableVoices.find(v => v.localService) ||
                availableVoices[0];
            setSelectedVoice(defaultVoice);
            userPreferredVoiceRef.current = defaultVoice;
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
   * Enhanced Language Detection for a specific string
   */
  const getBestVoiceForSegment = (text: string): SpeechSynthesisVoice | null => {
    const availableVoices = voices.length > 0 ? voices : synth.current.getVoices();
    
    // 1. Detect Japanese (Hiragana/Katakana)
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) {
       return availableVoices.find(v => v.lang.startsWith('ja')) || userPreferredVoiceRef.current;
    }

    // 2. Detect Chinese (Hanzi) - focusing on segments that DON'T have Kana
    if (/[\u4E00-\u9FFF]/.test(text)) {
        const zhVoice = availableVoices.find(v => v.lang.startsWith('zh') || v.lang.startsWith('cmn'));
        // Try to find a high-quality Chinese voice like Meijia if possible
        const meijia = availableVoices.find(v => v.name.toLowerCase().includes('meijia') && v.lang.startsWith('zh'));
        return meijia || zhVoice || userPreferredVoiceRef.current;
    }

    // 3. Detect English
    if (/[a-zA-Z]/.test(text)) {
        return availableVoices.find(v => v.lang.startsWith('en')) || userPreferredVoiceRef.current;
    }

    return userPreferredVoiceRef.current;
  };

  /**
   * Helper: Parse text into smaller segments for better lang switching.
   */
  const parseTextToSegments = (fullText: string): UtteranceSegment[] => {
    const segments: UtteranceSegment[] = [];
    // Split by sentence endings and preserve them
    const regex = /([^.!?。！？\n\r]+[.!?。！？\n\r]*)|([.!?。！？\n\r]+)/g;
    
    let match;
    while ((match = regex.exec(fullText)) !== null) {
      const text = match[0];
      const hasContent = /[a-zA-Z0-9\u00C0-\u00FF\u3000-\u9FFF\u3040-\u309F\u30A0-\u30FF]/.test(text);

      if (hasContent) {
        segments.push({ text, offset: match.index });
      }
    }
    
    if (segments.length === 0 && fullText.trim().length > 0) {
      segments.push({ text: fullText, offset: 0 });
    }
    
    return segments;
  };

  /**
   * Play Segment with per-segment voice detection
   */
  const playSegment = (index: number, settings: TTSSettings) => {
    if (index >= segmentsRef.current.length) {
      setTtsState(prev => ({ ...prev, isSpeaking: false, isPaused: false, charIndex: -1 }));
      activeUtteranceRef.current = null;
      return;
    }

    const segment = segmentsRef.current[index];
    
    // CRITICAL FIX: Detect the best voice for THIS specific segment
    const segmentVoice = getBestVoiceForSegment(segment.text);
    
    const utterance = new SpeechSynthesisUtterance(segment.text);
    if (segmentVoice) {
      utterance.voice = segmentVoice;
      utterance.lang = segmentVoice.lang; 
    }

    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;
    utterance.volume = settings.volume;

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
        if (activeUtteranceRef.current === utterance) {
            playSegment(index + 1, settings);
        }
    };

    utterance.onend = () => {
      setTimeout(playNext, 0); 
    };

    utterance.onerror = (e) => {
      console.warn("TTS Segment Error:", e);
      setTimeout(playNext, 0);
    };

    (window as any)._activeTTSUtterance = utterance;
    activeUtteranceRef.current = utterance;
    
    synth.current.speak(utterance);
  };

  const speak = useCallback((text: string, settings: TTSSettings) => {
    synth.current.cancel();
    if (!text.trim()) return;

    segmentsRef.current = parseTextToSegments(text);
    if (segmentsRef.current.length > 0) {
        playSegment(0, settings);
    }
  }, [voices]);

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

  // Wrap manual selection to update the ref
  const handleSetSelectedVoice = useCallback((voice: SpeechSynthesisVoice) => {
    setSelectedVoice(voice);
    userPreferredVoiceRef.current = voice;
  }, []);

  return {
    voices,
    selectedVoice,
    setSelectedVoice: handleSetSelectedVoice,
    speak,
    pause,
    resume,
    cancel,
    ttsState
  };
};
