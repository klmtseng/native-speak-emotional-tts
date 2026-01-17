
import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, Globe } from 'lucide-react';

interface VoiceSelectorProps {
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  onVoiceChange: (voice: SpeechSynthesisVoice) => void;
}

type LangFilter = 'all' | 'en' | 'zh' | 'ja';

const FILTERS: { id: LangFilter; label: string; flag: string }[] = [
  { id: 'all', label: 'All', flag: '🌏' },
  { id: 'en', label: 'English', flag: '🇺🇸' },
  { id: 'zh', label: 'Chinese', flag: '🇹🇼' }, // Covers ZH-CN, ZH-TW, ZH-HK
  { id: 'ja', label: 'Japanese', flag: '🇯🇵' },
];

const VoiceSelector: React.FC<VoiceSelectorProps> = ({ voices, selectedVoice, onVoiceChange }) => {
  const [filter, setFilter] = useState<LangFilter>('all');

  // Filter voices based on language code (BCP 47 tag)
  const filteredVoices = useMemo(() => {
    if (filter === 'all') return voices;
    return voices.filter(voice => 
      voice.lang.toLowerCase().replace('_', '-').startsWith(filter)
    );
  }, [voices, filter]);

  // Sync Voice -> Filter
  // If the engine auto-switches the voice (e.g. via auto-detect), update the filter UI to match
  useEffect(() => {
    if (!selectedVoice) return;
    
    const lang = selectedVoice.lang.toLowerCase().replace('_', '-');
    
    // Only switch if the current filter hides the selected voice
    if (filter !== 'all' && !lang.startsWith(filter)) {
      if (lang.startsWith('en')) setFilter('en');
      else if (lang.startsWith('zh')) setFilter('zh');
      else if (lang.startsWith('ja')) setFilter('ja');
      else setFilter('all');
    }
  }, [selectedVoice]); // Removed 'filter' dependency to avoid circular loops

  return (
    <div className="w-full max-w-md mx-auto mb-4">
      {/* Language Filter Chips */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar mask-gradient touch-pan-x">
        {FILTERS.map((item) => {
          const isActive = filter === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 border
                ${isActive 
                  ? 'bg-primary border-primary text-white shadow-lg shadow-primary/25' 
                  : 'bg-surface border-white/5 text-gray-400 hover:bg-white/5 hover:text-white'
                }
              `}
            >
              <span>{item.flag}</span>
              <span>{item.label}</span>
              {isActive && filteredVoices.length > 0 && (
                <span className="ml-1 text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
                  {filteredVoices.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Voice Dropdown */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Globe className={`h-5 w-5 transition-colors ${selectedVoice ? 'text-indigo-400' : 'text-gray-500'}`} />
        </div>
        <select
          value={selectedVoice?.voiceURI || ''}
          onChange={(e) => {
            const voice = voices.find(v => v.voiceURI === e.target.value);
            if (voice) onVoiceChange(voice);
          }}
          className="block w-full pl-10 pr-10 py-3 text-base border-none rounded-2xl bg-surface text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary shadow-lg appearance-none transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-ellipsis overflow-hidden"
          aria-label="Select Voice"
        >
          {voices.length === 0 ? (
            <option>Loading voices...</option>
          ) : filteredVoices.length === 0 ? (
            <option>No voices found for this filter</option>
          ) : (
            filteredVoices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} ({voice.lang})
              </option>
            ))
          )}
        </select>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <ChevronDown className="h-5 w-5 text-gray-400" />
        </div>
      </div>
    </div>
  );
};

export default VoiceSelector;
