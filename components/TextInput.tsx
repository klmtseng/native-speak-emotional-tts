
import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { DEFAULT_TEXT } from '../constants';

interface TextInputProps {
  text: string;
  setText: (text: string) => void;
  charIndex: number;
  isSpeaking: boolean;
  onFileDrop: (file: File) => void;
}

const TextInput: React.FC<TextInputProps> = ({ text, setText, charIndex, isSpeaking, onFileDrop }) => {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Only accept text-based files roughly
      if (file.type.startsWith('text/') || file.name.match(/\.(txt|md|srt|vtt|json|js|ts|tsx)$/i)) {
          onFileDrop(file);
      }
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
    return `${before}<span class="bg-primary/60 rounded-sm text-transparent">${highlight}</span>${after}`;
  };

  // Ensure identical typography styles for both layers to prevent pixel drift
  const typographyStyles = "text-lg md:text-xl font-normal leading-relaxed font-sans tracking-normal";

  return (
    <div 
        className={`
            relative flex-1 w-full max-w-4xl mx-auto mt-4 overflow-hidden rounded-3xl border shadow-inner transition-all duration-300
            ${isDragging ? 'border-primary bg-primary/10 ring-4 ring-primary/20 scale-[1.01]' : 'border-white/5 bg-surface/30'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
    >
      {/* Drag Overlay Indicator */}
      {isDragging && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-primary/20 p-6 rounded-full mb-4">
                  <Upload size={48} className="text-primary animate-bounce" />
              </div>
              <p className="text-xl font-bold text-white">Drop file to read</p>
              <p className="text-sm text-gray-400 mt-2">Support .txt, .md, .srt</p>
          </div>
      )}

      {/* 
        Bottom Layer (Overlay): 
        This layer only renders the background color of the highlight. 
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
        placeholder="Type, paste text, or drag & drop a file here to listen..."
        spellCheck="false"
      />
    </div>
  );
};

export default TextInput;
