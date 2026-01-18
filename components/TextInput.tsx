
import React, { useRef, useEffect } from 'react';
import { DEFAULT_TEXT } from '../constants';

interface TextInputProps {
  text: string;
  setText: (text: string) => void;
  charIndex: number;
  isSpeaking: boolean;
}

const TextInput: React.FC<TextInputProps> = ({ text, setText, charIndex, isSpeaking }) => {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Sync scroll between textarea and overlay
  const handleScroll = () => {
    if (textAreaRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = textAreaRef.current.scrollTop;
    }
  };

  // Auto-clear default text on focus
  const handleFocus = () => {
    if (text === DEFAULT_TEXT) {
      setText('');
    }
  };

  // Generate highlighted HTML
  const getHighlightedText = () => {
    if (charIndex === -1 || !isSpeaking) return text;
    
    // Simple heuristic to find word end
    let endIndex = text.indexOf(' ', charIndex);
    if (endIndex === -1) endIndex = text.length;
    
    const punctuation = ['.', ',', '!', '?', '\n', '。', '，', '！', '？'];
    for(const p of punctuation) {
        const pIndex = text.indexOf(p, charIndex);
        if(pIndex !== -1 && pIndex < endIndex) {
            endIndex = pIndex + 1; 
        }
    }

    const before = text.substring(0, charIndex);
    const highlight = text.substring(charIndex, endIndex);
    const after = text.substring(endIndex);

    // CRITICAL: The highlight span must have text-transparent to avoid ghosting/double text.
    // We only use it for the background-color.
    return `${before}<span class="bg-primary/60 rounded-sm text-transparent">${highlight}</span>${after}`;
  };

  // Ensure identical typography styles for both layers to prevent pixel drift
  const typographyStyles = "text-lg md:text-xl font-normal leading-relaxed font-sans tracking-normal";

  return (
    <div className="relative flex-1 w-full max-w-4xl mx-auto mt-4 overflow-hidden rounded-3xl border border-white/5 bg-surface/30 shadow-inner">
      {/* 
        Bottom Layer (Overlay): 
        This layer only renders the background color of the highlight. 
        The text itself is transparent to prevent ghosting with the top layer.
      */}
      <div 
        ref={overlayRef}
        className={`absolute inset-0 p-6 whitespace-pre-wrap break-words text-transparent pointer-events-none overflow-y-auto ${typographyStyles}`}
        style={{ fontVariantLigatures: 'none' }}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: getHighlightedText() }}
      />
      
      {/* 
        Top Layer (Actual Input): 
        The source of truth for all visible text.
      */}
      <textarea
        ref={textAreaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onScroll={handleScroll}
        onFocus={handleFocus}
        className={`absolute inset-0 w-full h-full p-6 bg-transparent text-gray-100 placeholder-gray-600 resize-none focus:outline-none focus:ring-0 z-10 ${typographyStyles}`}
        style={{ fontVariantLigatures: 'none', WebkitTextFillColor: 'currentColor' }}
        placeholder="Type or paste something here to listen..."
        spellCheck="false"
      />
    </div>
  );
};

export default TextInput;
