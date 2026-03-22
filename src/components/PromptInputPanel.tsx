import React from 'react';
import { Bot, User, Braces, Image, FileText, Edit2, Check, X } from 'lucide-react';
import { VariableType, VariableMeta } from '../types';

interface Props {
  systemPrompt: string;
  userPrompt: string;
  extractedVars: string[];
  varValues: Record<string, string>;
  variableMeta: Record<string, VariableMeta>;
  onSystemPromptChange: (v: string) => void;
  onUserPromptChange: (v: string) => void;
  onVarChange: (key: string, val: string) => void;
  onVarTypeChange: (key: string, type: VariableType) => void;
  onRenameVar: (oldName: string, newName: string) => void;
}

const VARIABLE_NAME_RE = /^[A-Za-z\u4e00-\u9fa5_][A-Za-z0-9_\u4e00-\u9fa5]*$/;

const typeLabels: Record<VariableType, string> = {
  text: '文本',
  image: '图片',
  file: '文件',
};

const PromptInputPanel: React.FC<Props> = ({
  systemPrompt,
  userPrompt,
  extractedVars,
  varValues,
  variableMeta,
  onSystemPromptChange,
  onUserPromptChange,
  onVarChange,
  onVarTypeChange,
  onRenameVar,
}) => {
  const [editingVar, setEditingVar] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const handleStartEdit = (varName: string) => {
    setEditingVar(varName);
    setEditValue(varName);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingVar(null);
    setEditValue('');
    setError(null);
  };

  const handleCommitEdit = (oldName: string) => {
    const newName = editValue.trim();
    if (!newName) {
      setError('变量名不能为空');
      return;
    }
    if (!VARIABLE_NAME_RE.test(newName)) {
      setError('格式错误：必须以字母或中文开头');
      return;
    }
    if (newName !== oldName && extractedVars.includes(newName)) {
      setError('变量名已存在');
      return;
    }
    if (newName === oldName) {
      handleCancelEdit();
      return;
    }
    onRenameVar(oldName, newName);
    handleCancelEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent, oldName: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommitEdit(oldName);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleFileSelect = (v: string, type: 'image' | 'file') => {
    const input = document.createElement('input');
    input.type = 'file';
    if (type === 'image') input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => onVarChange(v, reader.result as string);
        if (type === 'image') reader.readAsDataURL(file);
        else reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div className="w-[30%] flex-none border-r border-slate-200 flex flex-col bg-gradient-to-b from-slate-50/50 to-white overflow-hidden">
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
              placeholder={'输入要测试的提示词内容...\n\n使用 {{变量名}} 语法插入变量，支持中英文'}
              className="w-full h-[180px] p-3 text-sm rounded-xl border border-slate-200 bg-white resize-none outline-none transition-all duration-200
                placeholder:text-slate-300 text-slate-700 leading-relaxed
                focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10
                hover:border-slate-300"
            />
            <div className="absolute bottom-2 right-2 text-[10px] text-slate-300 opacity-0 group-focus-within:opacity-100 transition-opacity">
              {userPrompt.length} chars
            </div>
          </div>
        </div>

        {/* Variable Section - Always Expanded */}
        <div className="flex flex-col gap-3 bg-slate-50 rounded-xl border border-slate-100 p-3">
          <div className="flex items-center gap-2">
            <Braces size={14} className="text-amber-500" />
            <span className="text-xs font-semibold text-slate-600">变量值</span>
            {extractedVars.length > 0 && (
              <span className="text-[10px] text-white bg-amber-500 px-1.5 py-0.5 rounded-full">
                {extractedVars.length}
              </span>
            )}
          </div>

          {extractedVars.length === 0 ? (
            <div className="p-3 rounded-lg border border-dashed border-slate-200 bg-white">
              <p className="text-xs text-slate-400 leading-relaxed">
                在 Prompt 中使用 <code className="text-amber-600 font-mono bg-amber-50 px-1 rounded">{'{{变量名}}'}</code> 语法提取变量
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {extractedVars.map(v => {
                const meta = variableMeta[v] ?? { type: 'text' as VariableType };
                const isEditing = editingVar === v;
                
                return (
                  <div key={v} className="bg-white rounded-lg border border-slate-200 p-2.5">
                    {/* Variable Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        {isEditing ? (
                          <>
                            <span className="text-[11px] text-slate-400">{'{{'}</span>
                            <input
                              type="text"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onKeyDown={e => handleKeyDown(e, v)}
                              onBlur={() => handleCommitEdit(v)}
                              autoFocus
                              className="w-20 h-5 text-[11px] font-mono text-indigo-600 bg-white border border-indigo-300 rounded px-1 outline-none"
                            />
                            <span className="text-[11px] text-slate-400">{'}}'}</span>
                            {error && <span className="text-[9px] text-red-500">{error}</span>}
                          </>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(v)}
                            className="flex items-center gap-1 text-[11px] font-mono text-slate-500 hover:text-indigo-600 transition-colors"
                          >
                            <span>{`{{${v}}}`}</span>
                            <Edit2 size={10} className="opacity-50" />
                          </button>
                        )}
                      </div>
                      
                      <select
                        value={meta.type}
                        onChange={e => onVarTypeChange(v, e.target.value as VariableType)}
                        className="h-5 text-[10px] border border-slate-200 rounded px-1 bg-white text-slate-500 outline-none"
                      >
                        <option value="text">{typeLabels.text}</option>
                        <option value="image">{typeLabels.image}</option>
                        <option value="file">{typeLabels.file}</option>
                      </select>
                    </div>

                    {/* Variable Input */}
                    {meta.type === 'text' && (
                      <input
                        type="text"
                        value={varValues[v] ?? ''}
                        onChange={e => onVarChange(v, e.target.value)}
                        placeholder={`输入 ${v}...`}
                        className="w-full h-7 border border-slate-200 rounded-lg px-2 text-xs text-slate-700 bg-white outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10"
                      />
                    )}

                    {meta.type === 'image' && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleFileSelect(v, 'image')}
                          className="flex-1 h-7 border border-slate-200 rounded-lg px-2 text-xs text-slate-500 bg-white hover:bg-slate-50 flex items-center justify-center gap-1"
                        >
                          <Image size={12} />
                          选择图片
                        </button>
                        {varValues[v] && (
                          <button
                            onClick={() => onVarChange(v, '')}
                            className="w-7 h-7 border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 flex items-center justify-center"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    )}

                    {meta.type === 'file' && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleFileSelect(v, 'file')}
                          className="flex-1 h-7 border border-slate-200 rounded-lg px-2 text-xs text-slate-500 bg-white hover:bg-slate-50 flex items-center justify-center gap-1"
                        >
                          <FileText size={12} />
                          选择文件
                        </button>
                        {varValues[v] && (
                          <button
                            onClick={() => onVarChange(v, '')}
                            className="w-7 h-7 border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 flex items-center justify-center"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Preview */}
                    {meta.type === 'image' && varValues[v] && (
                      <img src={varValues[v]} alt="预览" className="w-full h-16 object-cover rounded-lg border border-slate-200 mt-1.5" />
                    )}
                    {meta.type === 'file' && varValues[v] && (
                      <div className="mt-1.5 p-1.5 bg-slate-50 rounded border border-slate-200 text-[9px] text-slate-500 font-mono truncate">
                        {varValues[v].slice(0, 50)}...
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromptInputPanel;
