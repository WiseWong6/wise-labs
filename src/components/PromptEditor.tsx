import React, { useState, useMemo } from 'react';
import { Play, Loader2 } from 'lucide-react';
import { useStore, buildModelKey, getOpenModelsForProvider } from '../state/store';
import { getTextProviderConfigs } from '../services/configAdapter';
import { DEFAULT_TEXT_PROVIDERS } from '../constants';
import { Task, PromptGroup } from '../types';
import { generateId } from '../utils/helpers';

const PromptEditor: React.FC = () => {
  const { state, dispatch, taskQueue } = useStore();
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Get available text models
  const textModels = useMemo(() => {
    const configs = getTextProviderConfigs();
    const models: Array<{ providerId: string; providerLabel: string; modelId: string; modelLabel: string }> = [];

    // From saved configs
    for (const config of configs) {
      if (!config.enabled) continue;
      for (const model of config.models) {
        if (!model.enabled) continue;
        models.push({
          providerId: config.id,
          providerLabel: config.label,
          modelId: model.id,
          modelLabel: model.label,
        });
      }
    }

    // If no configs saved, use defaults (with SiliconFlow key if available)
    if (models.length === 0) {
      for (const provider of DEFAULT_TEXT_PROVIDERS) {
        for (const model of provider.models) {
          models.push({
            providerId: provider.id,
            providerLabel: provider.label,
            modelId: model.id,
            modelLabel: model.label,
          });
        }
      }
    }

    // Also include OCR providers as text models (SiliconFlow has text models)
    const ocrTextModels = getOpenModelsForProvider('siliconflow', state.enabledModelsByProvider);
    // Don't add OCR models as text models - they are separate

    return models;
  }, [state.enabledModelsByProvider]);

  const toggleModel = (key: string) => {
    setSelectedModels(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleRun = () => {
    if (!userPrompt.trim()) return;
    if (selectedModels.length === 0) return;

    setIsRunning(true);

    const groupId = generateId('pg-');
    const promptGroup: PromptGroup = {
      id: groupId,
      label: userPrompt.slice(0, 40) + (userPrompt.length > 40 ? '...' : ''),
      systemPrompt,
      userPrompt,
      createdAt: Date.now(),
    };

    dispatch({ type: 'ADD_PROMPT_GROUP', group: promptGroup });

    const newTasks: Task[] = selectedModels.map(key => {
      const model = textModels.find(m => buildModelKey(m.providerId, m.modelId) === key);
      if (!model) return null;
      return {
        id: generateId('task-'),
        type: 'prompt' as const,
        groupId,
        providerId: model.providerId,
        providerLabel: model.providerLabel,
        modelId: model.modelId,
        modelLabel: model.modelLabel,
        status: 'queued' as const,
        statusMessage: '等待处理...',
        systemPrompt,
        userPrompt,
        pagesData: {},
      };
    }).filter(Boolean) as Task[];

    dispatch({ type: 'ADD_TASKS', tasks: newTasks });
    dispatch({ type: 'SET_ACTIVE_GROUP', groupId });
    taskQueue.enqueueBatch(newTasks);

    setIsRunning(false);
  };

  return (
    <div className="border-b border-slate-200/80 bg-gradient-to-b from-slate-50 to-white">
      <div className="p-4 space-y-3">
        {/* System Prompt */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            System Prompt
          </label>
          <textarea
            value={systemPrompt}
            onChange={e => setSystemPrompt(e.target.value)}
            placeholder="(可选) 设定模型角色和行为..."
            className="w-full h-20 border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none shadow-card focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 outline-none bg-white transition-shadow duration-200"
          />
        </div>

        {/* User Prompt */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            User Prompt
          </label>
          <textarea
            value={userPrompt}
            onChange={e => setUserPrompt(e.target.value)}
            placeholder="输入你要测试的提示词..."
            className="w-full h-28 border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none shadow-card focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 outline-none bg-white transition-shadow duration-200"
          />
        </div>

        {/* Model Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            选择模型
          </label>
          <div className="flex flex-wrap gap-2">
            {textModels.map(model => {
              const key = buildModelKey(model.providerId, model.modelId);
              const selected = selectedModels.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleModel(key)}
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium border transition-all duration-150 active:scale-[0.98] ${
                    selected
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:shadow-card'
                  }`}
                >
                  {model.modelLabel}
                  <span className="text-[11px] ml-1.5 opacity-60">{model.providerLabel}</span>
                </button>
              );
            })}
            {textModels.length === 0 && (
              <span className="text-sm text-slate-400">请在设置中配置文本模型</span>
            )}
          </div>
        </div>

        {/* Run Button */}
        <div className="flex justify-end">
          <button
            onClick={handleRun}
            disabled={!userPrompt.trim() || selectedModels.length === 0 || isRunning}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 shadow-sm shadow-indigo-200 transition-all duration-150 active:scale-[0.97]"
          >
            {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Run ({selectedModels.length} 个模型)
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromptEditor;
