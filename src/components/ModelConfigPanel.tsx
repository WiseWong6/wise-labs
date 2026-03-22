import React from 'react';
import { buildModelKey } from '../state/store';
import { VariableType, VariableMeta } from '../types';
import { Eye, Wrench, Brain } from 'lucide-react';

interface TextModel {
  providerId: string;
  providerLabel: string;
  modelId: string;
  modelLabel: string;
  vision?: boolean;
  tools?: boolean;
  thinking?: boolean;
}

interface Props {
  extractedVars: string[];
  varValues: Record<string, string>;
  variableMeta: Record<string, VariableMeta>;
  onVarChange: (key: string, val: string) => void;
  onVarTypeChange: (key: string, type: VariableType) => void;
  onRenameVar: (oldName: string, newName: string) => void;
  textModels: TextModel[];
  selectedModels: string[];
  onToggleModel: (key: string) => void;
  temperature: number;
  maxTokens: number;
  seed: number;
  enableThinking: boolean;
  enableTools: boolean;
  onTemperatureChange: (v: number) => void;
  onMaxTokensChange: (v: number) => void;
  onSeedChange: (v: number) => void;
  onThinkingChange: (v: boolean) => void;
  onToolsChange: (v: boolean) => void;
}

const VARIABLE_NAME_RE = /^[A-Za-z][A-Za-z0-9_]*$/;

const ModelConfigPanel: React.FC<Props> = ({
  extractedVars,
  varValues,
  variableMeta,
  onVarChange,
  onVarTypeChange,
  onRenameVar,
  textModels,
  selectedModels,
  onToggleModel,
  temperature,
  maxTokens,
  seed,
  enableThinking,
  enableTools,
  onTemperatureChange,
  onMaxTokensChange,
  onSeedChange,
  onThinkingChange,
  onToolsChange,
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

    // 空值校验
    if (!newName) {
      setError('变量名不能为空');
      return;
    }

    // 格式校验
    if (!VARIABLE_NAME_RE.test(newName)) {
      setError('格式错误：必须以字母开头，只能包含字母、数字、下划线');
      return;
    }

    // 重名检测（排除自己）
    if (newName !== oldName && extractedVars.includes(newName)) {
      setError('变量名已存在');
      return;
    }

    // 没有变化，直接取消编辑
    if (newName === oldName) {
      handleCancelEdit();
      return;
    }

    // 执行改名
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
    if (type === 'image') {
      input.accept = 'image/*';
    }
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          onVarChange(v, result);
        };
        if (type === 'image') {
          reader.readAsDataURL(file);
        } else {
          reader.readAsText(file);
        }
      }
    };
    input.click();
  };

  const typeLabels: Record<VariableType, string> = {
    text: '文本',
    image: '图片',
    file: '文件',
  };

  return (
    <div className="w-[240px] flex-none border-r border-slate-200/80 flex flex-col bg-white overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

        {/* Variable Inputs */}
        {extractedVars.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">变量输入</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
            {extractedVars.map(v => {
              const meta = variableMeta[v] ?? { type: 'text' as VariableType };
              return (
                <div key={v} className="flex flex-col gap-1">
                  {/* 变量名和类型选择器 */}
                  <div className="flex items-center justify-between">
                    {editingVar === v ? (
                      <div className="flex items-center gap-1 flex-1">
                        <span className="text-[11px] text-slate-400 font-mono">{"{{"}</span>
                        <input
                          type="text"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => handleKeyDown(e, v)}
                          onBlur={() => handleCommitEdit(v)}
                          autoFocus
                          className="flex-1 h-6 text-[11px] font-mono text-indigo-600 bg-white border border-indigo-300 rounded px-1.5 outline-none focus:ring-2 focus:ring-indigo-500/30"
                        />
                        <span className="text-[11px] text-slate-400 font-mono">{"}}"}</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartEdit(v)}
                        className="text-[11px] text-slate-400 font-mono text-left hover:text-indigo-600 transition-colors cursor-pointer group flex items-center gap-1"
                      >
                        <span>{`{{${v}}}`}</span>
                        <svg className="w-3 h-3 opacity-0 group-hover:opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    )}
                    {/* 类型选择器 */}
                    <select
                      value={meta.type}
                      onChange={e => onVarTypeChange(v, e.target.value as VariableType)}
                      className="h-5 text-[10px] border border-slate-200 rounded px-1 bg-white text-slate-500 outline-none focus:ring-1 focus:ring-indigo-500/30"
                    >
                      <option value="text">{typeLabels.text}</option>
                      <option value="image">{typeLabels.image}</option>
                      <option value="file">{typeLabels.file}</option>
                    </select>
                  </div>
                  {error && editingVar === v && <span className="text-[10px] text-red-500">{error}</span>}

                  {/* 输入区域 */}
                  {meta.type === 'text' && (
                    <input
                      type="text"
                      value={varValues[v] ?? ''}
                      onChange={e => onVarChange(v, e.target.value)}
                      placeholder={`输入 ${v} 的值...`}
                      className="w-full h-8 border border-slate-200 rounded-lg px-2.5 text-sm text-slate-700 bg-white outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all placeholder-slate-300"
                    />
                  )}

                  {(meta.type === 'image' || meta.type === 'file') && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleFileSelect(v, meta.type as 'image' | 'file')}
                        className="flex-1 h-8 border border-slate-200 rounded-lg px-2.5 text-sm text-slate-500 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>选择{meta.type === 'image' ? '图片' : '文件'}</span>
                      </button>
                      {varValues[v] && (
                        <button
                          onClick={() => onVarChange(v, '')}
                          className="w-8 h-8 border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 hover:border-red-200 transition-all flex items-center justify-center"
                          title="清除"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}

                  {/* 图片预览 */}
                  {meta.type === 'image' && varValues[v] && (
                    <div className="mt-1">
                      <img
                        src={varValues[v]}
                        alt="预览"
                        className="w-full h-16 object-cover rounded border border-slate-200"
                      />
                    </div>
                  )}

                  {/* 文件内容预览 */}
                  {meta.type === 'file' && varValues[v] && (
                    <div className="mt-1 p-2 bg-slate-50 rounded border border-slate-200 text-[10px] text-slate-500 font-mono line-clamp-3 overflow-hidden">
                      {varValues[v].slice(0, 200)}{varValues[v].length > 200 ? '...' : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Model Selection */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">选择模型</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>
          <div className="flex flex-col gap-1.5">
            {textModels.map(model => {
              const key = buildModelKey(model.providerId, model.modelId);
              const selected = selectedModels.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => onToggleModel(key)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm border transition-all duration-150 active:scale-[0.98] ${
                    selected
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate">{model.modelLabel}</span>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {model.vision && (
                        <span title="支持视觉"><Eye size={10} className={selected ? 'text-indigo-400' : 'text-slate-400'} /></span>
                      )}
                      {model.tools && (
                        <span title="支持工具"><Wrench size={10} className={selected ? 'text-indigo-400' : 'text-slate-400'} /></span>
                      )}
                      {model.thinking && (
                        <span title="支持思考"><Brain size={10} className={selected ? 'text-indigo-400' : 'text-slate-400'} /></span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] opacity-40 ml-1 flex-none">{model.providerLabel}</span>
                </button>
              );
            })}
            {textModels.length === 0 && (
              <p className="text-xs text-slate-300 italic">请在设置中配置文本模型</p>
            )}
          </div>
        </div>

        {/* Parameters */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">参数配置</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* Thinking Mode */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <label className="text-xs text-slate-500">思考模式</label>
              <span className="text-[10px] text-slate-400">启用模型推理过程</span>
            </div>
            <button
              onClick={() => onThinkingChange(!enableThinking)}
              className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                enableThinking ? 'bg-orange-500' : 'bg-slate-200'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                  enableThinking ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Tools Mode */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <label className="text-xs text-slate-500">工具调用</label>
              <span className="text-[10px] text-slate-400">启用 Tool Use</span>
            </div>
            <button
              onClick={() => onToolsChange(!enableTools)}
              className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                enableTools ? 'bg-teal-500' : 'bg-slate-200'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                  enableTools ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Temperature */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-500">Temperature</label>
              <span className="text-xs font-mono text-indigo-600 tabular-nums">{temperature.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={e => onTemperatureChange(Number(e.target.value))}
              className="w-full h-1.5 accent-indigo-600 cursor-pointer"
            />
          </div>

          {/* Max Tokens */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-500">Max Tokens</label>
            <input
              type="number"
              min="256"
              max="32768"
              step="256"
              value={maxTokens}
              onChange={e => onMaxTokensChange(Number(e.target.value))}
              className="w-full h-8 border border-slate-200 rounded-lg px-2.5 text-sm text-slate-700 bg-white outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
            />
          </div>

          {/* Seed */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-500">Seed</label>
              <span className="text-xs font-mono text-indigo-600 tabular-nums">{seed || '随机'}</span>
            </div>
            <input
              type="number"
              min="0"
              max="10000"
              step="1"
              value={seed || ''}
              onChange={e => onSeedChange(Number(e.target.value))}
              placeholder="留空则随机"
              className="w-full h-8 border border-slate-200 rounded-lg px-2.5 text-sm text-slate-700 bg-white outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all placeholder-slate-300"
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default ModelConfigPanel;
