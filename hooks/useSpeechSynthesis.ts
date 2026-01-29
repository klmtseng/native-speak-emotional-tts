
import { useState, useEffect, useCallback, useRef } from 'react';
import { TTSSettings, TTSState } from '../types';

interface UtteranceSegment {
  text: string;
  offset: number;
}

// Added 'yue' for Cantonese
type LangType = 'ja' | 'zh' | 'yue' | 'en' | 'neutral';
type Gender = 'female' | 'male' | 'unknown';

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
  
  // Helper: Normalize language tags for cross-browser comparison
  // e.g., "zh_HK" -> "zh-hk", "en-US" -> "en-us"
  const normalizeLang = (lang: string) => lang.toLowerCase().replace('_', '-');

  // Helper: Detect gender from voice name (Heuristic)
  const getVoiceGender = (voice: SpeechSynthesisVoice): Gender => {
    const name = voice.name.toLowerCase();
    
    // 1. Explicit labels
    if (name.includes('female') || name.includes('woman') || name.includes('girl')) return 'female';
    if (name.includes('male') || name.includes('man') || name.includes('boy')) return 'male';

    // 2. iOS / macOS / Apple Specific Names
    const appleFemales = [
        'samantha', 'karen', 'tessa', 'moira', 'veena', 'fiona',   
        'ting-ting', 'meijia', 'sin-ji', 'shu-han',               
        'kyoko', 'otoya',                                         
        'amelie', 'anna', 'carmit', 'lekha', 'mariska', 'melina', 
        'monica', 'nora', 'paulina', 'satu', 'yuna', 'zosia', 'zuzana', 'sara', 
        'alice', 'aurora', 'joana', 'alva', 'kanya', 'yuri'       
    ];

    const appleMales = [
        'daniel', 'fred', 'gordon', 'rishi', 'xander',            
        'kangkang', 
        'hattori', 
        'aaron', 'arthur', 'jorge', 'juan', 'maged', 'martin', 'thomas'
    ];

    if (appleFemales.some(n => name.includes(n))) return 'female';
    if (appleMales.some(n => name.includes(n))) return 'male';

    return 'unknown';
  };

  /**
   * Helper: Replace noisy punctuation and Emojis with spaces to silence them 
   * CRITICAL: Must preserve string length (match.length) to keep charIndex aligned for highlighting.
   */
  const sanitizeForSpeech = (text: string): string => {
      // 1. Replace noisy punctuation BUT protect:
      //    a) Dates/Ranges: digit-hyphen-digit (2026-01)
      //    b) Negative Numbers: space/start-hyphen-digit ( -5)
      
      let clean = text.replace(
          /(\d)-(\d)|(\s|^)-(\d)|[-()\[\]{}<>"'_*@#$%^&+=`~|\\/]/g, 
          (match, d1, d2, s1, n1) => {
              if (d1 && d2) return match; // Protect date format 2026-01
              if (n1) return match;       // Protect negative number -5 (s1 is space or start)
              return ' '.repeat(match.length);
          }
      );
      
      // 2. Replace Emojis and Pictographs
      clean = clean.replace(/[\p{Extended_Pictographic}]/gu, (match) => ' '.repeat(match.length));
      
      return clean;
  };

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
     if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'ja';
     
     const cantoneseMarkers = /[係唔佢嘅冇睇咗嚟喺哋俾諗乜嘢咁喎]/;
     if (cantoneseMarkers.test(text)) return 'yue';

     if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
     if (/[a-zA-Z]/.test(text)) return 'en';
     return 'neutral';
  };

  /**
   * Helper: Parse text into smaller segments for better lang switching.
   */
  const parseTextToSegments = (fullText: string): UtteranceSegment[] => {
    const segments: UtteranceSegment[] = [];
    
    // CRITICAL FIX FOR v1.3.6 (2026-01-30):
    // The regex now explicitly includes `(?:\d+\.\d+)` in the content group.
    // This forces sequences like "1.3" or "1.3.6" to be treated as content, 
    // preventing the dot from being interpreted as a sentence terminator.
    
    const sentenceRegex = /((?:[^.!?。！？\n\r]|(?:\d+\.\d+)|[.!?。！？](?!\s|$))+)(?:[.!?。！？\n\r]+(?=\s|$)|$|[\n\r]+)/g;
    
    let match;
    while ((match = sentenceRegex.exec(fullText)) !== null) {
      const sentence = match[0]; // Captures the full segment including punctuation
      const sentenceOffset = match.index;
      
      if (!sentence.trim()) continue; // Skip empty segments

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
            // Push preceding non-CJK text
            const nonCjkText = sentence.substring(lastIndex, subMatch.index);
            if (nonCjkText) { 
               segments.push({ text: nonCjkText, offset: sentenceOffset + lastIndex });
            }

            // Push CJK text
            segments.push({ text: subMatch[0], offset: sentenceOffset + subMatch.index });
            
            lastIndex = cjkRegex.lastIndex;
         }

         // Push remaining text
         const remaining = sentence.substring(lastIndex);
         if (remaining) {
            segments.push({ text: remaining, offset: sentenceOffset + lastIndex });
         }

      } else {
        segments.push({ text: sentence, offset: sentenceOffset });
      }
    }
    
    // Fallback: If regex fails to capture anything but text exists, treat as one block
    if (segments.length === 0 && fullText.trim().length > 0) {
      segments.push({ text: fullText, offset: 0 });
    }
    
    return segments;
  };

  /**
   * Helper to scan neighbors for a valid language
   */
  const scanContext = (currentIndex: number, allSegments: UtteranceSegment[]): LangType => {
      let foundLang: LangType = 'neutral';
      
      // Look ahead 2 steps, look behind 2 steps
      const indices = [currentIndex + 1, currentIndex + 2, currentIndex - 1, currentIndex - 2];
      
      for (const idx of indices) {
          if (idx >= 0 && idx < allSegments.length && foundLang === 'neutral') {
              const lang = getSegmentLang(allSegments[idx].text);
              if (lang !== 'neutral') foundLang = lang;
          }
      }

      return foundLang;
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
    const allSegments = segmentsRef.current;
    
    // 1. Identify Language Type
    let langType = getSegmentLang(segment.text);
    
    // 2. Resolve Context
    if (langType === 'neutral') {
        const contextLang = scanContext(index, allSegments);
        if (contextLang !== 'neutral') {
            langType = contextLang;
        }
    }
    
    // Ambiguous Standard Chinese (zh) -> Check if surrounding context is Cantonese (yue)
    if (langType === 'zh') {
        const contextLang = scanContext(index, allSegments);
        if (contextLang === 'yue') {
            langType = 'yue';
        }
    }

    // 3. Select Voice based on Resolved LangType AND Gender Consistency
    const availableVoices = voices.length > 0 ? voices : synth.current.getVoices();
    let targetVoice: SpeechSynthesisVoice | undefined;

    // Detect user's preferred gender
    const preferredGender = userPreferredVoiceRef.current ? getVoiceGender(userPreferredVoiceRef.current) : 'unknown';

    // Helper to find voice with gender preference
    const findVoice = (matcher: (v: SpeechSynthesisVoice) => boolean) => {
        if (preferredGender !== 'unknown') {
            const genderMatch = availableVoices.find(v => matcher(v) && getVoiceGender(v) === preferredGender);
            if (genderMatch) return genderMatch;
        }
        return availableVoices.find(matcher);
    };

    switch (langType) {
        case 'ja':
            targetVoice = findVoice(v => normalizeLang(v.lang).startsWith('ja'));
            break;
        case 'yue': // Cantonese
            targetVoice = findVoice(v => {
                const l = normalizeLang(v.lang);
                return l === 'zh-hk' || l === 'zh-yue' || l === 'yue';
            });
            break;
        case 'zh': // Mandarin
            // Check preferred voice first
            if (userPreferredVoiceRef.current) {
                const prefLang = normalizeLang(userPreferredVoiceRef.current.lang);
                if (prefLang === 'zh-hk' || prefLang.includes('yue')) {
                   targetVoice = userPreferredVoiceRef.current;
                }
            }
            
            if (!targetVoice) {
                targetVoice = findVoice(v => {
                    const l = normalizeLang(v.lang);
                    const isMandarin = (l.startsWith('zh') || l.startsWith('cmn')) && l !== 'zh-hk' && !l.includes('yue');
                    return isMandarin;
                });
            }
            break;
        case 'en':
            targetVoice = findVoice(v => normalizeLang(v.lang).startsWith('en'));
            break;
    }
    
    if (!targetVoice && langType !== 'neutral') {
        if (langType === 'yue') targetVoice = availableVoices.find(v => normalizeLang(v.lang).startsWith('zh'));
    }

    const finalVoice = targetVoice || userPreferredVoiceRef.current;

    // 5. Pre-process text (High Accuracy Dates + Sanitization)
    let speakText = segment.text;

    // Enhance Date Reading: Convert 2026-01-30 to Natural Speech for CJK
    if (['zh', 'yue', 'ja'].includes(langType)) {
        speakText = speakText.replace(/(\d{4})-(\d{2})-(\d{2})/g, '$1年$2月$3日');
    }

    // Sanitize punctuation (but keep date hyphens and negative numbers)
    speakText = sanitizeForSpeech(speakText);

    const utterance = new SpeechSynthesisUtterance(speakText);
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
