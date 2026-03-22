import React from 'react';
import { buildModelKey } from '../state/store';
import { Eye, Wrench, Brain, Sliders, Boxes, Thermometer, Hash, Sparkles } from 'lucide-react';

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

const ModelConfigPanel: React.FC<Props> = ({
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
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set(['models', 'params']));

  const SectionHeader = ({ icon, title, count, sectionId }: { icon: React.ReactNode; title: string; count?: number; sectionId: string }) => {
    const isExpanded = expandedSections.has(sectionId);
    return (
      <button
        onClick={() => {
          const next = new Set(expandedSections);
          if (next.has(sectionId)) {
            next.delete(sectionId);
          } else {
            next.add(sectionId);
          }
          setExpandedSections(next);
        }}
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
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    );
  };

  return (
    <div className="w-[30%] flex-none border-r border-slate-200 flex flex-col bg-white overflow-hidden">
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
          
          {expandedSections.has('models') && (
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
                        <span className="text-[10px] opacity-40">{model.providerLabel}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Parameters */}
        <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
          <div className="px-3">
            <SectionHeader
              icon={<Sliders size={14} />}
              title="参数配置"
              sectionId="params"
            />
          </div>
          
          {expandedSections.has('params') && (
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
