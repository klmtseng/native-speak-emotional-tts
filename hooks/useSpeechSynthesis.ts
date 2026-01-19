
import { useState, useEffect, useCallback, useRef } from 'react';
import { TTSSettings, TTSState } from '../types';

interface UtteranceSegment {
  text: string;
  offset: number;
}

type LangType = 'ja' | 'zh' | 'en' | 'neutral';

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
   * Determine language category for a text segment
   */
  const getSegmentLang = (text: string): LangType => {
     // Hiragana/Katakana -> Japanese
     if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'ja';
     // Hanzi -> Chinese (simplification: if mixed with Kana, previous rule catches it)
     if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
     // Latin -> English
     if (/[a-zA-Z]/.test(text)) return 'en';
     return 'neutral';
  };

  /**
   * Helper: Parse text into smaller segments for better lang switching.
   */
  const parseTextToSegments = (fullText: string): UtteranceSegment[] => {
    const segments: UtteranceSegment[] = [];
    // 1. Coarse split by sentence endings (preserve delimiters)
    const sentenceRegex = /([^.!?。！？\n\r]+[.!?。！？\n\r]*)|([.!?。！？\n\r]+)/g;
    
    let match;
    while ((match = sentenceRegex.exec(fullText)) !== null) {
      const sentence = match[0];
      const sentenceOffset = match.index;

      // Check for mixed content (Latin vs CJK)
      const hasCJK = /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/.test(sentence);
      const hasLatin = /[a-zA-Z]/.test(sentence);

      // 2. Intra-sentence splitting if mixed languages detected
      if (hasCJK && hasLatin) {
         // Regex to isolate CJK blocks (including full-width punctuation)
         const cjkRegex = /([\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF00-\uFFEF]+)/g;
         
         let lastIndex = 0;
         let subMatch;

         while ((subMatch = cjkRegex.exec(sentence)) !== null) {
            // Push preceding non-CJK text (e.g., "3. Privacy First (")
            const nonCjkText = sentence.substring(lastIndex, subMatch.index);
            if (nonCjkText) { 
               segments.push({ text: nonCjkText, offset: sentenceOffset + lastIndex });
            }

            // Push CJK text (e.g., "隱私優先")
            segments.push({ text: subMatch[0], offset: sentenceOffset + subMatch.index });
            
            lastIndex = cjkRegex.lastIndex;
         }

         // Push remaining text (e.g., ")")
         const remaining = sentence.substring(lastIndex);
         if (remaining) {
            segments.push({ text: remaining, offset: sentenceOffset + lastIndex });
         }

      } else {
        // Simple sentence (all English, all CJK, or Neutral like "3.")
        if (sentence.trim()) {
          segments.push({ text: sentence, offset: sentenceOffset });
        }
      }
    }
    
    if (segments.length === 0 && fullText.trim().length > 0) {
      segments.push({ text: fullText, offset: 0 });
    }
    
    return segments;
  };

  /**
   * Play Segment with contextual voice detection
   */
  const playSegment = (index: number, settings: TTSSettings) => {
    if (index >= segmentsRef.current.length) {
      setTtsState(prev => ({ ...prev, isSpeaking: false, isPaused: false, charIndex: -1 }));
      activeUtteranceRef.current = null;
      return;
    }

    const segment = segmentsRef.current[index];
    
    // 1. Identify Language Type with Finite Context Lookahead/Lookbehind
    let langType = getSegmentLang(segment.text);
    
    // Contextual Resolver for Neutral segments (e.g. "3.", "123", "...")
    if (langType === 'neutral') {
        let foundLang: LangType = 'neutral';
        
        // Priority 1: Look ahead 1 step
        if (index + 1 < segmentsRef.current.length) {
            const next = getSegmentLang(segmentsRef.current[index + 1].text);
            if (next !== 'neutral') foundLang = next;
        }
        
        // Priority 2: Look ahead 2 steps
        if (foundLang === 'neutral' && index + 2 < segmentsRef.current.length) {
             const next2 = getSegmentLang(segmentsRef.current[index + 2].text);
             if (next2 !== 'neutral') foundLang = next2;
        }

        // Priority 3: Look behind 1 step
        if (foundLang === 'neutral' && index - 1 >= 0) {
             const prev = getSegmentLang(segmentsRef.current[index - 1].text);
             if (prev !== 'neutral') foundLang = prev;
        }

        // Priority 4: Look behind 2 steps
        if (foundLang === 'neutral' && index - 2 >= 0) {
             const prev2 = getSegmentLang(segmentsRef.current[index - 2].text);
             if (prev2 !== 'neutral') foundLang = prev2;
        }
        
        if (foundLang !== 'neutral') {
            langType = foundLang;
        }
        // If still neutral, it falls back to default voice (no break/return here)
    }

    // 2. Select Voice based on Resolved LangType
    const availableVoices = voices.length > 0 ? voices : synth.current.getVoices();
    let targetVoice: SpeechSynthesisVoice | undefined;

    switch (langType) {
        case 'ja':
            targetVoice = availableVoices.find(v => v.lang.startsWith('ja'));
            break;
        case 'zh':
            // Prioritize high-quality voices like Meijia if available
            targetVoice = availableVoices.find(v => v.name.toLowerCase().includes('meijia') && v.lang.startsWith('zh')) 
                          || availableVoices.find(v => v.lang.startsWith('zh') || v.lang.startsWith('cmn'));
            break;
        case 'en':
            targetVoice = availableVoices.find(v => v.lang.startsWith('en'));
            break;
    }
    
    // 3. Fallback to user preference
    const finalVoice = targetVoice || userPreferredVoiceRef.current;

    const utterance = new SpeechSynthesisUtterance(segment.text);
    if (finalVoice) {
      utterance.voice = finalVoice;
      utterance.lang = finalVoice.lang; 
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
