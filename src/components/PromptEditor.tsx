import React, { useState, useMemo } from 'react';
import { Play, Loader2, Eye, Wrench, Brain } from 'lucide-react';
import { useStore, buildModelKey } from '../state/store';
import { getUnifiedProviders } from '../services/configAdapter';
import { Task, PromptGroup } from '../types';
import { generateId } from '../utils/helpers';

const PromptEditor: React.FC = () => {
  const { state, dispatch, taskQueue } = useStore();
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Get available LLM models from unified providers
  const textModels = useMemo(() => {
    const providers = getUnifiedProviders();
    const models: Array<{
      providerId: string;
      providerLabel: string;
      modelId: string;
      modelLabel: string;
      vision?: boolean;
      tools?: boolean;
      thinking?: boolean;
    }> = [];
    
    for (const provider of providers) {
      if (!provider.enabled) continue;
      for (const model of provider.models) {
        if (!model.enabled || model.capabilities !== 'llm') continue;
        models.push({
          providerId: provider.id,
          providerLabel: provider.label,
          modelId: model.id,
          modelLabel: model.label,
          vision: model.vision,
          tools: model.tools,
          thinking: model.thinking,
        });
      }
    }
    return models;
  }, []);

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
                  <div className="flex items-center gap-1.5">
                    <span>{model.modelLabel}</span>
                    <div className="flex items-center gap-0.5">
                      {model.vision && (
                        <span title="支持视觉"><Eye size={12} className={selected ? 'text-indigo-400' : 'text-slate-400'} /></span>
                      )}
                      {model.tools && (
                        <span title="支持工具"><Wrench size={12} className={selected ? 'text-indigo-400' : 'text-slate-400'} /></span>
                      )}
                      {model.thinking && (
                        <span title="支持思考"><Brain size={12} className={selected ? 'text-indigo-400' : 'text-slate-400'} /></span>
                      )}
                    </div>
                  </div>
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
