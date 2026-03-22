import React from 'react';
import { buildModelKey } from '../state/store';
import { VariableType, VariableMeta } from '../types';
import { Eye, Wrench, Brain, Sliders, Boxes, Thermometer, Hash, Sparkles, Puzzle } from 'lucide-react';

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

const typeLabels: Record<VariableType, string> = {
  text: '文本',
  image: '图片',
  file: '文件',
};

const typeIcons: Record<VariableType, React.ReactNode> = {
  text: <span className="text-xs">T</span>,
  image: <span className="text-xs">🖼</span>,
  file: <span className="text-xs">📄</span>,
};

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
  const [expandedSection, setExpandedSection] = React.useState<string | null>('models');

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
      setError('格式错误：必须以字母开头，只能包含字母、数字、下划线');
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

  const SectionHeader = ({ icon, title, count, sectionId }: { icon: React.ReactNode; title: string; count?: number; sectionId: string }) => (
    <button
      onClick={() => setExpandedSection(expandedSection === sectionId ? null : sectionId)}
      className="w-full flex items-center justify-between py-2 group"
    >
      <div className="flex items-center gap-2">
        <span className="text-slate-400">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</span>
        {count !== undefined && count > 0 && (
          <span className="text-[10px] text-white bg-indigo-500 px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {count}
          </span>
        )}
      </div>
      <svg
        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expandedSection === sectionId ? 'rotate-180' : ''}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );

  return (
    <div className="w-[280px] flex-none border-r border-slate-200 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="flex-none px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/50">
        <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <span className="w-5 h-5 rounded-md bg-violet-100 text-violet-600 flex items-center justify-center">
            <Sliders size={12} />
          </span>
          模型与参数
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">

        {/* Model Selection */}
        <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
          <div className="px-3">
            <SectionHeader
              icon={<Boxes size={14} />}
              title="选择模型"
              count={selectedModels.length}
              sectionId="models"
            />
          </div>
          
          {expandedSection === 'models' && (
            <div className="px-3 pb-3 flex flex-col gap-1.5 max-h-[200px] overflow-y-auto">
              {textModels.length === 0 ? (
                <div className="p-3 rounded-lg bg-slate-100 text-center">
                  <p className="text-xs text-slate-400">请在设置中配置 LLM 模型</p>
                </div>
              ) : (
                textModels.map(model => {
                  const key = buildModelKey(model.providerId, model.modelId);
                  const selected = selectedModels.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => onToggleModel(key)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-all duration-150 active:scale-[0.98] ${
                        selected
                          ? 'bg-white border border-indigo-200 text-indigo-700 shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                        selected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300'
                      }`}>
                        {selected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium truncate">{model.modelLabel}</span>
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
                        <span className="text-[10px] text-slate-400">{model.providerLabel}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Variable Inputs */}
        {extractedVars.length > 0 && (
          <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
            <div className="px-3">
              <SectionHeader
                icon={<Puzzle size={14} />}
                title="变量值"
                count={extractedVars.length}
                sectionId="vars"
              />
            </div>
            
            {expandedSection === 'vars' && (
              <div className="px-3 pb-3 flex flex-col gap-2">
                {extractedVars.map(v => {
                  const meta = variableMeta[v] ?? { type: 'text' as VariableType };
                  return (
                    <div key={v} className="flex flex-col gap-1.5 bg-white p-2.5 rounded-lg border border-slate-200">
                      {/* Variable header */}
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
                            className="text-[11px] text-slate-500 font-mono text-left hover:text-indigo-600 transition-colors cursor-pointer group flex items-center gap-1"
                          >
                            <span>{`{{${v}}}`}</span>
                            <svg className="w-3 h-3 opacity-0 group-hover:opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        )}
                        <select
                          value={meta.type}
                          onChange={e => onVarTypeChange(v, e.target.value as VariableType)}
                          className="h-6 text-[10px] border border-slate-200 rounded-md px-1.5 bg-white text-slate-500 outline-none focus:ring-1 focus:ring-indigo-500/30"
                        >
                          <option value="text">{typeLabels.text}</option>
                          <option value="image">{typeLabels.image}</option>
                          <option value="file">{typeLabels.file}</option>
                        </select>
                      </div>
                      {error && editingVar === v && <span className="text-[10px] text-red-500">{error}</span>}

                      {/* Input area */}
                      {meta.type === 'text' && (
                        <input
                          type="text"
                          value={varValues[v] ?? ''}
                          onChange={e => onVarChange(v, e.target.value)}
                          placeholder={`输入 ${v}...`}
                          className="w-full h-8 border border-slate-200 rounded-lg px-2.5 text-sm text-slate-700 bg-white outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all placeholder-slate-300"
                        />
                      )}

                      {(meta.type === 'image' || meta.type === 'file') && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleFileSelect(v, meta.type as 'image' | 'file')}
                            className="flex-1 h-8 border border-slate-200 rounded-lg px-2.5 text-xs text-slate-500 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-1.5"
                          >
                            <span>{typeIcons[meta.type]}</span>
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

                      {/* Preview */}
                      {meta.type === 'image' && varValues[v] && (
                        <img src={varValues[v]} alt="预览" className="w-full h-16 object-cover rounded-lg border border-slate-200" />
                      )}
                      {meta.type === 'file' && varValues[v] && (
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-[10px] text-slate-500 font-mono line-clamp-2 overflow-hidden">
                          {varValues[v].slice(0, 100)}{varValues[v].length > 100 ? '...' : ''}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Parameters */}
        <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
          <div className="px-3">
            <SectionHeader
              icon={<Sliders size={14} />}
              title="参数配置"
              sectionId="params"
            />
          </div>
          
          {expandedSection === 'params' && (
            <div className="px-3 pb-3 flex flex-col gap-3">
              {/* Thinking Mode */}
              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-orange-500" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-700">思考模式</span>
                    <span className="text-[10px] text-slate-400">Extended Thinking</span>
                  </div>
                </div>
                <button
                  onClick={() => onThinkingChange(!enableThinking)}
                  className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                    enableThinking ? 'bg-orange-500' : 'bg-slate-200'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                    enableThinking ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Tools Mode */}
              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2">
                  <Wrench size={14} className="text-teal-500" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-700">工具调用</span>
                    <span className="text-[10px] text-slate-400">Tool Use</span>
                  </div>
                </div>
                <button
                  onClick={() => onToolsChange(!enableTools)}
                  className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                    enableTools ? 'bg-teal-500' : 'bg-slate-200'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                    enableTools ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Temperature */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <Thermometer size={14} className="text-rose-500" />
                  <span className="text-xs font-medium text-slate-700">Temperature</span>
                  <span className="text-xs font-mono text-indigo-600 tabular-nums ml-auto">{temperature.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={e => onTemperatureChange(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Max Tokens */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <Hash size={14} className="text-blue-500" />
                  <span className="text-xs font-medium text-slate-700">Max Tokens</span>
                </div>
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
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-medium text-slate-700">Seed</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{seed || '随机'}</span>
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
          )}
        </div>

      </div>
    </div>
  );
};

export default ModelConfigPanel;
