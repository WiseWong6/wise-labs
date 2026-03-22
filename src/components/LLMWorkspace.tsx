import React, { useState, useMemo, useEffect } from 'react';
import { useStore, buildModelKey } from '../state/store';
import { getUnifiedProviders } from '../services/configAdapter';
import { Task, PromptGroup, VariableType, VariableMeta } from '../types';
import { generateId } from '../utils/helpers';
import PromptInputPanel from './PromptInputPanel';
import ModelConfigPanel from './ModelConfigPanel';
import PromptResultsPanel from './PromptResultsPanel';

function inferVariableType(varName: string): VariableType {
  const lower = varName.toLowerCase();
  if (lower.includes('image') || lower.includes('img') || lower.includes('picture') || lower.includes('photo')) return 'image';
  if (lower.includes('file') || lower.includes('doc') || lower.includes('attachment')) return 'file';
  return 'text';
}

const LLMWorkspace: React.FC = () => {
  const { dispatch, taskQueue } = useStore();

  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [seed, setSeed] = useState(0);
  const [enableThinking, setEnableThinking] = useState(false);
  const [enableTools, setEnableTools] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [variableMeta, setVariableMeta] = useState<Record<string, VariableMeta>>({});

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

  // 自动推断变量类型
  useEffect(() => {
    setVariableMeta(prev => {
      const newMeta: Record<string, VariableMeta> = {};
      extractedVars.forEach(v => {
        newMeta[v] = prev[v] ?? { type: inferVariableType(v) };
      });
      return newMeta;
    });
  }, [extractedVars]);

  // 重命名变量：同步更新 prompts 和迁移变量值
  const renameVariable = (oldName: string, newName: string) => {
    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tokenPattern = new RegExp(`\\{\\{\\s*${escapeRegExp(oldName)}\\s*\\}\\}`, 'g');

    // 更新 prompts
    setSystemPrompt(prev => prev.replace(tokenPattern, `{{${newName}}}`));
    setUserPrompt(prev => prev.replace(tokenPattern, `{{${newName}}}`));

    // 迁移变量值
    setVarValues(prev => {
      if (prev[oldName] !== undefined) {
        const { [oldName]: _, ...rest } = prev;
        return { ...rest, [newName]: prev[oldName] };
      }
      return prev;
    });

    // 迁移变量元数据
    setVariableMeta(prev => {
      if (prev[oldName] !== undefined) {
        const { [oldName]: _, ...rest } = prev;
        return { ...rest, [newName]: prev[oldName] };
      }
      return prev;
    });
  };

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
          seed: seed || undefined,
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
        variableMeta={variableMeta}
        onVarChange={(key, val) => setVarValues(prev => ({ ...prev, [key]: val }))}
        onVarTypeChange={(key, type) => setVariableMeta(prev => ({ ...prev, [key]: { ...prev[key], type } }))}
        onRenameVar={renameVariable}
        textModels={textModels}
        selectedModels={selectedModels}
        onToggleModel={(key) => setSelectedModels(prev =>
          prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        )}
        temperature={temperature}
        maxTokens={maxTokens}
        seed={seed}
        enableThinking={enableThinking}
        enableTools={enableTools}
        onTemperatureChange={setTemperature}
        onMaxTokensChange={setMaxTokens}
        onSeedChange={setSeed}
        onThinkingChange={setEnableThinking}
        onToolsChange={setEnableTools}
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
