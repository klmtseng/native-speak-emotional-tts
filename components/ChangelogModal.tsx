
import React from 'react';
import { X, GitCommit, CheckCircle2, Upload, History, Trash2, FileText } from 'lucide-react';

interface ControlGuide {
  icon: React.ReactNode;
  label: string;
  desc: string;
}

interface UpdateEntry {
  version: string;
  date: string;
  title: string;
  features: string[];
  controls?: ControlGuide[];
}

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UPDATES: UpdateEntry[] = [
  {
    version: 'v1.3.0',
    date: 'Current Version',
    title: 'Drag & Drop Experience',
    features: [
      'Added Drag and Drop file support for the text area.',
      'Added visual overlay when hovering files over the app.',
      'Refactored file reading logic for better performance.',
    ],
    controls: [
      { 
        icon: <Upload size={18} />, 
        label: 'Import / Drag & Drop', 
        desc: 'Support .txt, .md, .srt files' 
      },
      { 
        icon: <History size={18} />, 
        label: 'Version History', 
        desc: 'View development log' 
      },
      { 
        icon: <Trash2 size={18} />, 
        label: 'Reset', 
        desc: 'Clear text and stop audio' 
      }
    ]
  },
  {
    version: 'v1.2.0',
    date: 'File Format Expansion',
    title: 'Smart Format Parsing',
    features: [
      'Added support for Markdown (.md) files with syntax cleaning.',
      'Added support for Subtitle (.srt) files with timestamp removal.',
      'Improved text cleaning algorithm for better reading flow.',
    ]
  },
  {
    version: 'v1.1.0',
    date: 'File Import',
    title: 'Basic File Operations',
    features: [
      'Added file upload button for .txt files.',
      'Added "Clear Text" button to quickly reset the application.',
      'Integrated file reader with auto-play cancellation.',
    ]
  },
  {
    version: 'v1.0.0',
    date: 'Initial Release',
    title: 'Core TTS Engine',
    features: [
      'Offline Text-to-Speech using native browser API.',
      'Real-time text highlighting (Karaoke style).',
      'Voice selection with language filtering.',
      'Adjustable speed, pitch, and volume settings.',
      'Privacy-first architecture (no server uploads).',
    ]
  }
];

const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-surface border border-white/10 w-full max-w-lg max-h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-white">Development Log</h2>
            <p className="text-xs text-gray-400 mt-1">Track the evolution of NativeSpeak</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable List */}
        <div className="overflow-y-auto p-6 space-y-8">
          {UPDATES.map((update, index) => (
            <div key={update.version} className="relative pl-8 border-l border-white/10 last:border-0">
              {/* Timeline Dot */}
              <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${index === 0 ? 'bg-primary border-primary shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-surface border-gray-600'}`} />
              
              <div className="flex flex-col gap-1 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-mono font-bold ${index === 0 ? 'text-primary' : 'text-gray-300'}`}>
                    {update.version}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/5">
                    {update.date}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white">{update.title}</h3>
              </div>

              {/* Icon Guide (New Feature) */}
              {update.controls && (
                <div className="grid grid-cols-1 gap-2 mb-4 bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 px-1">Interface Guide</p>
                  {update.controls.map((ctrl, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                      <div className="p-2 bg-slate-800 rounded-lg text-primary shadow-sm border border-white/5">
                        {ctrl.icon}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-200">{ctrl.label}</span>
                        <span className="text-xs text-gray-500">{ctrl.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <ul className="space-y-2 mt-3">
                {update.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-400 leading-relaxed">
                    <CheckCircle2 size={14} className="mt-1 text-secondary shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          
          {/* Bottom Footer */}
           <div className="pt-8 flex items-center justify-center gap-2 text-gray-500 text-xs">
              <GitCommit size={14} />
              <span>NativeSpeak v1.3.0</span>
           </div>
        </div>

      </div>
    </div>
  );
};

export default ChangelogModal;
