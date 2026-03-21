import React, { useState, useMemo } from 'react';
import { useStore, buildModelKey } from '../state/store';
import { getTextProviderConfigs } from '../services/configAdapter';
import { DEFAULT_TEXT_PROVIDERS } from '../constants';
import { Task, PromptGroup } from '../types';
import { generateId } from '../utils/helpers';
import PromptInputPanel from './PromptInputPanel';
import ModelConfigPanel from './ModelConfigPanel';
import PromptResultsPanel from './PromptResultsPanel';

const LLMWorkspace: React.FC = () => {
  const { dispatch, taskQueue } = useStore();

  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [isRunning, setIsRunning] = useState(false);
  const [varValues, setVarValues] = useState<Record<string, string>>({});

  // Get available text models
  const textModels = useMemo(() => {
    const configs = getTextProviderConfigs();
    const models: Array<{ providerId: string; providerLabel: string; modelId: string; modelLabel: string }> = [];

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

    return models;
  }, []);

  // Extract {{变量名}} variables from prompts
  const extractedVars = useMemo(() => {
    const re = /\{\{([A-Za-z][A-Za-z0-9_]*)\}\}/g;
    const found = new Set<string>();
    for (const text of [systemPrompt, userPrompt]) {
      let m;
      const r = new RegExp(re.source, 'g');
      while ((m = r.exec(text)) !== null) found.add(m[1]);
    }
    return [...found];
  }, [systemPrompt, userPrompt]);

  const substituteVars = (text: string) =>
    text.replace(/\{\{([A-Za-z][A-Za-z0-9_]*)\}\}/g, (_, key) => varValues[key] ?? `{{${key}}}`);

  const handleRun = () => {
    if (!userPrompt.trim()) return;
    if (selectedModels.length === 0) return;
    setIsRunning(true);

    const resolvedSystem = substituteVars(systemPrompt);
    const resolvedUser = substituteVars(userPrompt);

    const groupId = generateId('pg-');
    const promptGroup: PromptGroup = {
      id: groupId,
      label: resolvedUser.slice(0, 40) + (resolvedUser.length > 40 ? '...' : ''),
      systemPrompt: resolvedSystem,
      userPrompt: resolvedUser,
      createdAt: Date.now(),
    };

    dispatch({ type: 'ADD_PROMPT_GROUP', group: promptGroup });

    const newTasks: Task[] = selectedModels
      .map(key => {
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
          systemPrompt: resolvedSystem,
          userPrompt: resolvedUser,
          pagesData: {},
          temperature,
          maxTokens,
        };
      })
      .filter(Boolean) as Task[];

    dispatch({ type: 'ADD_TASKS', tasks: newTasks });
    dispatch({ type: 'SET_ACTIVE_GROUP', groupId });
    taskQueue.enqueueBatch(newTasks);

    setIsRunning(false);
  };

  const canRun = Boolean(userPrompt.trim()) && selectedModels.length > 0 && !isRunning;

  return (
    <div className="flex-1 flex overflow-hidden min-h-0">
      <PromptInputPanel
        systemPrompt={systemPrompt}
        userPrompt={userPrompt}
        extractedVars={extractedVars}
        onSystemPromptChange={setSystemPrompt}
        onUserPromptChange={setUserPrompt}
      />
      <ModelConfigPanel
        extractedVars={extractedVars}
        varValues={varValues}
        onVarChange={(key, val) => setVarValues(prev => ({ ...prev, [key]: val }))}
        textModels={textModels}
        selectedModels={selectedModels}
        onToggleModel={(key) => setSelectedModels(prev =>
          prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        )}
        temperature={temperature}
        maxTokens={maxTokens}
        onTemperatureChange={setTemperature}
        onMaxTokensChange={setMaxTokens}
      />
      <PromptResultsPanel
        isRunning={isRunning}
        canRun={canRun}
        selectedCount={selectedModels.length}
        onRun={handleRun}
      />
    </div>
  );
};

export default LLMWorkspace;
