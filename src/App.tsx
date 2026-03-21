import React, { useRef, useCallback } from 'react';
import { Upload, Settings, Menu } from 'lucide-react';
import { useStore } from './state/store';
import Sidebar from './components/Sidebar';
import ComparisonGrid from './components/ComparisonGrid';
import LLMWorkspace from './components/LLMWorkspace';
import SettingsModal from './components/SettingsModal';
import UploadModal from './components/UploadModal';
import StatusBar from './components/StatusBar';

const App: React.FC = () => {
  const { state, dispatch } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;

      const valid = Array.from(e.target.files).filter(file => {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        return ['pdf', 'png', 'jpg', 'jpeg'].includes(ext);
      });

      if (valid.length === 0) {
        alert('没有选择有效文件。');
        e.target.value = '';
        return;
      }

      dispatch({
        type: 'SET_PENDING_UPLOADS',
        items: valid.map(file => ({
          id: Math.random().toString(36).slice(2, 10),
          file,
          rangeMode: 'all' as const,
          customPages: '',
        })),
      });
      dispatch({ type: 'SET_UPLOAD_OPEN', open: true });
      e.target.value = '';
    },
    [dispatch]
  );

  const hasActiveGroup = Boolean(state.activeGroupId);

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900 font-sans antialiased overflow-hidden">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Sidebar */}
      <Sidebar onUploadClick={handleUploadClick} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-white relative">
        {/* Header */}
        <header className="h-14 border-b border-slate-200/80 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 shadow-sm z-10 flex-shrink-0 select-none">
          <div className="flex items-center gap-2.5">
            {!state.sidebarOpen && (
              <button
                onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-all duration-150"
              >
                <Menu size={18} />
              </button>
            )}
            <h1 className="text-base font-bold text-slate-800">
              Model Evaluation Workbench
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {state.mode === 'ocr' && (
              <button
                onClick={handleUploadClick}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium shadow-sm shadow-indigo-200 transition-all duration-150 active:scale-[0.97]"
              >
                <Upload size={14} />
                上传文件
              </button>
            )}
            <button
              onClick={() => dispatch({ type: 'SET_SETTINGS_OPEN', open: true })}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-all duration-150"
            >
              <Settings size={18} />
            </button>
          </div>
        </header>

        {/* Main content area */}
        {state.mode === 'prompt' ? (
          <LLMWorkspace />
        ) : (
          <div className="flex-1 overflow-hidden">
            {!hasActiveGroup && state.tasks.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center h-full text-slate-400 select-none animate-fade-in">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center mb-5 shadow-card">
                  <Upload size={32} className="text-indigo-400" />
                </div>
                <p className="text-xl font-semibold text-slate-600">
                  上传文件以开始 OCR 评测
                </p>
                <p className="text-sm mt-2 text-slate-400">
                  支持 PDF、PNG、JPG 文件，可同时选择多个 OCR 模型进行对比
                </p>
                <button
                  onClick={() => dispatch({ type: 'SET_SETTINGS_OPEN', open: true })}
                  className="mt-5 px-4 py-2 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all duration-150 active:scale-[0.97]"
                >
                  配置 API Key
                </button>
              </div>
            ) : (
              <ComparisonGrid />
            )}
          </div>
        )}

        {/* Status Bar */}
        <StatusBar />
      </main>

      {/* Modals */}
      {state.settingsOpen && <SettingsModal />}
      {state.uploadOpen && <UploadModal />}
    </div>
  );
};

export default App;
