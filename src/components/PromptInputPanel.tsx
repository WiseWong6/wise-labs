import React from 'react';

interface Props {
  systemPrompt: string;
  userPrompt: string;
  extractedVars: string[];
  onSystemPromptChange: (v: string) => void;
  onUserPromptChange: (v: string) => void;
}

const PromptInputPanel: React.FC<Props> = ({
  systemPrompt,
  userPrompt,
  extractedVars,
  onSystemPromptChange,
  onUserPromptChange,
}) => {
  return (
    <div className="w-[280px] flex-none border-r border-slate-200/80 flex flex-col bg-white overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

        {/* System Prompt */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">System</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-300 transition-all">
            <textarea
              value={systemPrompt}
              onChange={e => onSystemPromptChange(e.target.value)}
              placeholder="(可选) 设定模型角色和行为..."
              className="w-full h-[120px] px-3 py-2.5 text-sm resize-none bg-transparent outline-none text-slate-700 placeholder-slate-300 leading-relaxed"
            />
          </div>
        </div>

        {/* User Prompt */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">User</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-300 transition-all">
            <textarea
              value={userPrompt}
              onChange={e => onUserPromptChange(e.target.value)}
              placeholder={'输入要测试的提示词...\n\n使用 {{变量名}} 插入变量'}
              className="w-full h-[260px] px-3 py-2.5 text-sm resize-none bg-transparent outline-none text-slate-700 placeholder-slate-300 leading-relaxed"
            />
          </div>
        </div>

        {/* Variable Extraction */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">变量提取</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>
          {extractedVars.length === 0 ? (
            <p className="text-xs text-slate-300 italic px-0.5">
              在 Prompt 中使用 {`{{变量名}}`} 提取变量
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {extractedVars.map(v => (
                <span
                  key={v}
                  className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-md border border-indigo-100 font-mono"
                >
                  {`{{${v}}}`}
                </span>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default PromptInputPanel;
