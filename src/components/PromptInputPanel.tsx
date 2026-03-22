import React from 'react';
import { Bot, User, Braces } from 'lucide-react';

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
    <div className="w-[320px] flex-none border-r border-slate-200 flex flex-col bg-gradient-to-b from-slate-50/50 to-white overflow-hidden">
      {/* Header */}
      <div className="flex-none px-4 py-3 border-b border-slate-100 bg-white">
        <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </span>
          提示词编辑
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* System Prompt */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Bot size={14} className="text-violet-500" />
            <span className="text-xs font-medium text-slate-600">System Prompt</span>
            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">可选</span>
          </div>
          <div className="relative group">
            <textarea
              value={systemPrompt}
              onChange={e => onSystemPromptChange(e.target.value)}
              placeholder="设定模型角色和行为..."
              className="w-full h-[100px] p-3 text-sm rounded-xl border border-slate-200 bg-white resize-none outline-none transition-all duration-200
                placeholder:text-slate-300 text-slate-700 leading-relaxed
                focus:border-violet-300 focus:ring-4 focus:ring-violet-500/10
                hover:border-slate-300"
            />
            <div className="absolute bottom-2 right-2 text-[10px] text-slate-300 opacity-0 group-focus-within:opacity-100 transition-opacity">
              {systemPrompt.length} chars
            </div>
          </div>
        </div>

        {/* User Prompt */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <User size={14} className="text-indigo-500" />
            <span className="text-xs font-medium text-slate-600">User Prompt</span>
            <span className="text-[10px] text-red-400 bg-red-50 px-1.5 py-0.5 rounded">必填</span>
          </div>
          <div className="relative group">
            <textarea
              value={userPrompt}
              onChange={e => onUserPromptChange(e.target.value)}
              placeholder={'输入要测试的提示词内容...\n\n使用 {{变量名}} 语法插入动态变量'}
              className="w-full h-[200px] p-3 text-sm rounded-xl border border-slate-200 bg-white resize-none outline-none transition-all duration-200
                placeholder:text-slate-300 text-slate-700 leading-relaxed
                focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10
                hover:border-slate-300"
            />
            <div className="absolute bottom-2 right-2 text-[10px] text-slate-300 opacity-0 group-focus-within:opacity-100 transition-opacity">
              {userPrompt.length} chars
            </div>
          </div>
        </div>

        {/* Variable Extraction */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Braces size={14} className="text-amber-500" />
            <span className="text-xs font-medium text-slate-600">提取的变量</span>
            {extractedVars.length > 0 && (
              <span className="text-[10px] text-white bg-amber-500 px-1.5 py-0.5 rounded-full">
                {extractedVars.length}
              </span>
            )}
          </div>
          {extractedVars.length === 0 ? (
            <div className="p-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
              <p className="text-xs text-slate-400 leading-relaxed">
                在 Prompt 中使用 <code className="text-amber-600 font-mono bg-amber-50 px-1 rounded">{'{{变量名}}'}</code> 语法提取变量
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-amber-100 bg-amber-50/30">
              {extractedVars.map(v => (
                <span
                  key={v}
                  className="px-2 py-1 bg-white text-amber-700 text-xs rounded-lg border border-amber-200 font-mono shadow-sm"
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
