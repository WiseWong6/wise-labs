import React, { useState } from 'react';
import { Copy, Check, Trash2 } from 'lucide-react';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}

const Editor: React.FC<EditorProps> = ({ value, onChange, error }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50">
      <div className="flex h-12 shrink-0 items-center justify-between px-4 bg-slate-100 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Editor</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onChange('')}
            disabled={!value}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-xs font-medium transition-colors border bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30"
            title="清空"
            aria-label="清空"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={handleCopy}
            disabled={!value || copied}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded text-xs font-medium transition-colors border ${
              copied
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title={copied ? '已复制' : '复制原格式'}
            aria-label={copied ? '已复制' : '复制原格式'}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <textarea
          className={`absolute inset-0 h-full w-full overflow-auto p-4 bg-slate-50 text-slate-800 font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500/50 ${error ? 'bg-red-50/30' : ''}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          placeholder="Enter Markdown, HTML, JSON, or Mermaid syntax..."
        />
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border-t border-red-200 shrink-0">
          <div className="flex items-start gap-3">
            <div className="flex-1 text-red-700 text-xs font-mono break-all max-h-32 overflow-y-auto">
              <strong>Syntax Error:</strong> {error}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Editor;
