import React, { useState } from 'react';
import { Play, Pause, Square, Settings, Sparkles, Mic2 } from 'lucide-react';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import VoiceSelector from './components/VoiceSelector';
import SettingsPanel from './components/SettingsPanel';
import TextInput from './components/TextInput';
import { TTSSettings } from './types';
import { DEFAULT_SETTINGS, DEFAULT_TEXT } from './constants';

const App: React.FC = () => {
  const [text, setText] = useState<string>(DEFAULT_TEXT);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [settings, setSettings] = useState<TTSSettings>(DEFAULT_SETTINGS);
  
  const {
    voices,
    selectedVoice,
    setSelectedVoice,
    speak,
    pause,
    resume,
    cancel,
    ttsState
  } = useSpeechSynthesis();

  const handlePlay = () => {
    if (ttsState.isPaused) {
      resume();
    } else if (ttsState.isSpeaking) {
        // Already speaking, do nothing or restart? Let's restart if clicked again
        speak(text, settings);
    } else {
      speak(text, settings);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-slate-900">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
            <Mic2 className="text-white h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">NativeSpeak</h1>
            <p className="text-xs text-gray-400 font-medium">On-Device Processing</p>
          </div>
        </div>
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className={`p-3 rounded-full transition-all duration-300 ${showSettings ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
        >
          <Settings size={22} />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative px-4 pb-24 md:pb-32 overflow-hidden">
        
        {/* Settings Overlay - Mobile Friendly */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showSettings ? 'max-h-96 opacity-100 mb-4' : 'max-h-0 opacity-0 mb-0'}`}>
           <div className="max-w-md mx-auto">
             <SettingsPanel settings={settings} onChange={setSettings} isOpen={showSettings} />
           </div>
        </div>

        {/* Voice Select */}
        <div className="z-10">
          <VoiceSelector 
            voices={voices} 
            selectedVoice={selectedVoice} 
            onVoiceChange={setSelectedVoice} 
          />
        </div>

        {/* Text Area */}
        <TextInput 
          text={text} 
          setText={setText} 
          charIndex={ttsState.charIndex}
          isSpeaking={ttsState.isSpeaking}
        />
        
        {/* Status Indicator (Visual Flair) */}
        {ttsState.isSpeaking && !ttsState.isPaused && (
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none animate-pulse-slow mix-blend-screen" />
        )}
      </main>

      {/* Fixed Bottom Controls */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background/95 to-transparent z-50">
        <div className="max-w-md mx-auto flex items-center justify-center gap-6 md:gap-8">
          
          {/* Stop Button */}
          <button
            onClick={cancel}
            disabled={!ttsState.isSpeaking && !ttsState.isPaused}
            className="p-4 rounded-full text-gray-400 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          >
            <Square size={24} fill="currentColor" />
          </button>

          {/* Play/Pause Main Button */}
          <button
            onClick={ttsState.isSpeaking && !ttsState.isPaused ? pause : handlePlay}
            className="w-20 h-20 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:scale-105 active:scale-95 transition-all duration-300 group"
          >
            {ttsState.isSpeaking && !ttsState.isPaused ? (
              <Pause size={32} fill="currentColor" className="group-hover:rotate-90 transition-transform duration-300" />
            ) : (
              <Play size={32} fill="currentColor" className="ml-1 group-hover:scale-110 transition-transform duration-300" />
            )}
          </button>

          {/* Clear Text Button (Contextual) */}
          <button
            onClick={() => setText('')}
            className="p-4 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            title="Clear Text"
          >
            <Sparkles size={24} />
          </button>
        </div>
        
        {/* Safe Area for iOS Home Indicator */}
        <div className="h-4 w-full"></div>
      </div>
    </div>
  );
};

export default App;
