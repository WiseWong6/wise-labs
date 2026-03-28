import React, { useState } from 'react';
import { PanelLeft, Code, Settings, Github } from 'lucide-react';
import Editor from './components/Editor';
import MixedPreview from './components/MixedPreview';
import AISettingsModal from './components/AISettingsModal';
import { useDebounce } from './hooks/useDebounce';
import {
  DEFAULT_MERMAID_CODE,
  SAMPLE_SEQUENCE,
  SAMPLE_MIXED,
  SAMPLE_JSON,
  SAMPLE_MARKDOWN,
  SAMPLE_HTML,
} from './constants';
import { AIConfig } from './types/ai-config';
import { loadAIConfig, saveAIConfig, fixCodeWithAI } from './services/ai-service';

const App: React.FC = () => {
  const [code, setCode] = useState<string>(SAMPLE_MIXED);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFixing, setIsFixing] = useState(false);
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(() => loadAIConfig());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSample, setActiveSample] = useState<string>('Mixed');

  const [debouncedCode, flushCode] = useDebounce(code, 600);

  const loadSample = (label: string, sample: string) => {
    setCode(sample);
    flushCode(sample);
    setActiveSample(label);
    setError(null);
  };

  const handleSaveAIConfig = (config: AIConfig) => {
    saveAIConfig(config);
    setAiConfig(config);
  };

  const handleFixCode = async () => {
    if (!code || !error || isFixing) return;

    if (!aiConfig) {
      setIsSettingsOpen(true);
      return;
    }

    setIsFixing(true);
    try {
      let fixedCode = await fixCodeWithAI(aiConfig, code, error);

      if (
        fixedCode.startsWith('```') &&
        fixedCode.endsWith('```') &&
        !code.trim().startsWith('```')
      ) {
        fixedCode = fixedCode.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
      }

      if (fixedCode) {
        setCode(fixedCode);
      }
    } catch (err) {
      console.error('Failed to fix code:', err);
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white text-slate-900">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <Code className="text-white w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">Mixed Preview</h1>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden md:flex space-x-2">
            {[
              ['Mixed', SAMPLE_MIXED],
              ['Markdown', SAMPLE_MARKDOWN],
              ['HTML', SAMPLE_HTML],
              ['JSON', SAMPLE_JSON],
              ['Flowchart', DEFAULT_MERMAID_CODE],
              ['Sequence', SAMPLE_SEQUENCE],
            ].map(([label, sample]) => (
              <button
                key={label}
                onClick={() => loadSample(label, sample)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  activeSample === label
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <a
            href="https://github.com/WiseWong6/wise-labs"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="GitHub"
          >
            <Github size={20} />
          </a>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="AI Settings"
          >
            <Settings size={20} />
          </button>

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2 rounded-md transition-colors ${isSidebarOpen ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
            title="Toggle Sidebar"
          >
            <PanelLeft size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        <div
          className={`${
            isSidebarOpen ? 'w-full md:w-[35%]' : 'w-0'
          } flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden`}
        >
          <Editor
            value={code}
            onChange={setCode}
            error={error}
            onFix={handleFixCode}
            isFixing={isFixing}
          />
        </div>

        <div className="flex-1 h-full min-w-0 bg-slate-50">
          <MixedPreview code={debouncedCode} onError={setError} />
        </div>
      </main>

      <AISettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveAIConfig}
        initialConfig={aiConfig}
      />
    </div>
  );
};

export default App;
