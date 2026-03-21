import React from 'react';
import { buildModelKey } from '../state/store';

interface TextModel {
  providerId: string;
  providerLabel: string;
  modelId: string;
  modelLabel: string;
}

interface Props {
  extractedVars: string[];
  varValues: Record<string, string>;
  onVarChange: (key: string, val: string) => void;
  textModels: TextModel[];
  selectedModels: string[];
  onToggleModel: (key: string) => void;
  temperature: number;
  maxTokens: number;
  onTemperatureChange: (v: number) => void;
  onMaxTokensChange: (v: number) => void;
}

const ModelConfigPanel: React.FC<Props> = ({
  extractedVars,
  varValues,
  onVarChange,
  textModels,
  selectedModels,
  onToggleModel,
  temperature,
  maxTokens,
  onTemperatureChange,
  onMaxTokensChange,
}) => {
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
            {extractedVars.map(v => (
              <div key={v} className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-400 font-mono">{`{{${v}}}`}</label>
                <input
                  type="text"
                  value={varValues[v] ?? ''}
                  onChange={e => onVarChange(v, e.target.value)}
                  placeholder={`输入 ${v} 的值...`}
                  className="w-full h-8 border border-slate-200 rounded-lg px-2.5 text-sm text-slate-700 bg-white outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all placeholder-slate-300"
                />
              </div>
            ))}
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
                  <span className="font-medium truncate">{model.modelLabel}</span>
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
        </div>

      </div>
    </div>
  );
};

export default ModelConfigPanel;
