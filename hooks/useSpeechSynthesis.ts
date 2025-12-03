import { useState, useEffect, useCallback, useRef } from 'react';
import { TTSSettings, TTSState } from '../types';

interface UtteranceSegment {
  text: string;
  offset: number;
  type: 'statement' | 'question' | 'exclamation' | 'pause';
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

  // Load voices
  useEffect(() => {
    const updateVoices = () => {
      const availableVoices = synth.current.getVoices();
      setVoices(availableVoices);
      
      if (!selectedVoice && availableVoices.length > 0) {
        // Try to find a good default voice (Google or Apple enhanced)
        const defaultVoice = 
          availableVoices.find(v => v.default) || 
          availableVoices.find(v => v.name.includes('Google')) ||
          availableVoices[0];
        setSelectedVoice(defaultVoice);
      }
    };

    updateVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = updateVoices;
    }

    return () => {
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [selectedVoice]);

  // Cleanup
  useEffect(() => {
    return () => {
      synth.current.cancel();
    };
  }, []);

  /**
   * Splits text into meaningful segments to allow the engine to pause/breathe.
   * Also identifies the "tone" of the segment.
   */
  const parseTextToSegments = (fullText: string): UtteranceSegment[] => {
    const segments: UtteranceSegment[] = [];
    // Regex matches sentence chunks including their delimiters
    // Covers English (.!?) and CJK (。！？) and newlines
    const regex = /([^.!?。！？\n\r]+[.!?。！？\n\r]+)|([^.!?。！？\n\r]+$)/g;
    
    let match;
    while ((match = regex.exec(fullText)) !== null) {
      const text = match[0];
      const offset = match.index;
      
      let type: UtteranceSegment['type'] = 'statement';
      if (text.match(/[?？]/)) type = 'question';
      else if (text.match(/[!！]/)) type = 'exclamation';
      
      segments.push({ text, offset, type });
    }
    
    return segments;
  };

  const speak = useCallback((text: string, settings: TTSSettings) => {
    // 1. Reset state
    if (synth.current.speaking) {
      synth.current.cancel();
    }
    
    if (!text.trim()) return;

    // 2. Parse text into chunks for "Emotional/Clear" playback
    const segments = parseTextToSegments(text);

    // 3. Queue each segment
    segments.forEach((segment, index) => {
      const utterance = new SpeechSynthesisUtterance(segment.text);
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      // Base Settings
      let segmentRate = settings.rate;
      let segmentPitch = settings.pitch;

      // --- EMOTIONAL HEURISTICS ---
      // Apply subtle adjustments based on punctuation to simulate emotion
      if (segment.type === 'question') {
        // Slightly higher pitch for questions, slightly slower
        segmentPitch = Math.min(2, settings.pitch * 1.05); 
        segmentRate = Math.max(0.1, settings.rate * 0.95);
      } else if (segment.type === 'exclamation') {
        // Slightly faster and very slightly higher pitch for excitement
        segmentRate = Math.min(10, settings.rate * 1.05);
        segmentPitch = Math.min(2, settings.pitch * 1.05); 
      } else {
        // Statements: Allow pitch to drop slightly for a "grounded" feel
        segmentPitch = settings.pitch;
      }

      utterance.rate = segmentRate;
      utterance.pitch = segmentPitch;
      utterance.volume = settings.volume;

      // --- EVENTS ---
      utterance.onstart = () => {
        setTtsState(prev => ({ ...prev, isSpeaking: true, isPaused: false }));
        activeUtteranceRef.current = utterance;
      };

      // We only care about global end if this is the last segment
      if (index === segments.length - 1) {
        utterance.onend = () => {
          setTtsState(prev => ({ 
            ...prev, 
            isSpeaking: false, 
            isPaused: false, 
            charIndex: -1, 
            currentWord: '' 
          }));
          activeUtteranceRef.current = null;
        };
      }

      utterance.onerror = (event) => {
        console.error("Speech synthesis error", event);
        if (index === segments.length - 1) {
             setTtsState(prev => ({ ...prev, isSpeaking: false, isPaused: false }));
        }
      };

      // Correctly map the local character index to the global text index
      utterance.onboundary = (event) => {
        if (event.name === 'word') {
           const globalIndex = segment.offset + event.charIndex;
           setTtsState(prev => ({ 
             ...prev, 
             charIndex: globalIndex 
           }));
        }
      };

      synth.current.speak(utterance);
    });

  }, [selectedVoice]);

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