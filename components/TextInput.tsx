import React, { useRef, useEffect } from 'react';

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

  // Generate highlighted HTML
  const getHighlightedText = () => {
    if (charIndex === -1 || !isSpeaking) return text;
    
    // Simple heuristic to find word end: space or punctuation
    // This is approximate as SpeechSynthesis doesn't give word length consistently across browsers
    let endIndex = text.indexOf(' ', charIndex);
    if (endIndex === -1) endIndex = text.length;
    
    // Check for other delimiters close by
    const punctuation = ['.', ',', '!', '?', '\n'];
    for(const p of punctuation) {
        const pIndex = text.indexOf(p, charIndex);
        if(pIndex !== -1 && pIndex < endIndex) {
            endIndex = pIndex + 1; // Include punctuation
        }
    }

    const before = text.substring(0, charIndex);
    const highlight = text.substring(charIndex, endIndex);
    const after = text.substring(endIndex);

    return `${before}<span class="bg-primary/50 text-white rounded px-0.5 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-75">${highlight}</span>${after}`;
  };

  return (
    <div className="relative flex-1 w-full max-w-4xl mx-auto mt-4 overflow-hidden rounded-3xl border border-white/5 bg-surface/30 shadow-inner">
      {/* Background Overlay for Highlight */}
      <div 
        ref={overlayRef}
        className="absolute inset-0 p-6 whitespace-pre-wrap break-words text-lg md:text-xl font-light text-transparent pointer-events-none overflow-y-auto font-sans leading-relaxed"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: getHighlightedText() }}
      />
      
      {/* Actual Input */}
      <textarea
        ref={textAreaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onScroll={handleScroll}
        className="absolute inset-0 w-full h-full p-6 bg-transparent text-lg md:text-xl font-light text-gray-100 placeholder-gray-600 resize-none focus:outline-none focus:ring-0 leading-relaxed font-sans z-10"
        placeholder="Type or paste something here to listen..."
        spellCheck="false"
      />
    </div>
  );
};

export default TextInput;
