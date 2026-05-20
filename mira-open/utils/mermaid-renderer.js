import { getMermaidConfig } from './mermaid-theme.js';

const PRIORITY_RANK = {
  high: 0,
  normal: 1,
  low: 2,
};

const THEMES = ['light', 'dark'];

let loadMermaid = () => import('mermaid').then((mod) => mod.default);
let mermaidPromise = null;
let activeTheme = null;
let isProcessing = false;
let isProcessScheduled = false;
let taskOrder = 0;
let renderId = 0;

const svgCache = new Map();
const inflightTasks = new Map();
const pendingTasks = [];

const normalizePriority = (priority) => (priority in PRIORITY_RANK ? priority : 'normal');
const getCacheKey = ({ code, theme }) => JSON.stringify([theme, code]);
const getAlternateTheme = (theme) => (theme === 'dark' ? 'light' : 'dark');

const getMermaid = () => {
  if (!mermaidPromise) {
    mermaidPromise = loadMermaid();
  }
  return mermaidPromise;
};

const scheduleQueueProcessing = () => {
  if (isProcessing || isProcessScheduled) return;
  isProcessScheduled = true;
  const schedule = typeof globalThis['queueMicrotask'] === 'function'
    ? globalThis['queueMicrotask'].bind(globalThis)
    : (callback) => Promise.resolve().then(callback);
  schedule(processQueue);
};

const takeNextTask = () => {
  if (pendingTasks.length === 0) return null;

  let nextIndex = 0;
  for (let index = 1; index < pendingTasks.length; index += 1) {
    const candidate = pendingTasks[index];
    const current = pendingTasks[nextIndex];
    const candidateRank = PRIORITY_RANK[candidate.priority];
    const currentRank = PRIORITY_RANK[current.priority];
    if (candidateRank < currentRank || (candidateRank === currentRank && candidate.order < current.order)) {
      nextIndex = index;
    }
  }

  const [task] = pendingTasks.splice(nextIndex, 1);
  return task;
};

async function runRenderTask(task) {
  task.started = true;
  const mermaid = await getMermaid();
  if (activeTheme !== task.theme) {
    mermaid.initialize(getMermaidConfig(task.theme));
    activeTheme = task.theme;
  }

  const id = `mermaid-${task.theme}-${renderId += 1}-${Math.random().toString(36).slice(2, 9)}`;
  const { svg } = await mermaid.render(id, task.code);
  svgCache.set(task.key, svg);
  task.resolve(svg);
}

function processQueue() {
  isProcessScheduled = false;
  if (isProcessing) return;

  const task = takeNextTask();
  if (!task) return;

  isProcessing = true;
  runRenderTask(task)
    .catch((error) => {
      task.reject(error);
    })
    .finally(() => {
      inflightTasks.delete(task.key);
      isProcessing = false;
      scheduleQueueProcessing();
    });
}

export const getCachedMermaidSvg = ({ code, theme }) => svgCache.get(getCacheKey({ code, theme })) ?? null;

export const renderMermaidSvg = ({ code, theme, priority = 'normal' }) => {
  const key = getCacheKey({ code, theme });
  const cachedSvg = svgCache.get(key);
  if (cachedSvg) return Promise.resolve(cachedSvg);

  const normalizedPriority = normalizePriority(priority);
  const existingTask = inflightTasks.get(key);
  if (existingTask) {
    if (
      !existingTask.task.started &&
      PRIORITY_RANK[normalizedPriority] < PRIORITY_RANK[existingTask.task.priority]
    ) {
      existingTask.task.priority = normalizedPriority;
      scheduleQueueProcessing();
    }
    return existingTask.promise;
  }

  let resolveTask;
  let rejectTask;
  const promise = new Promise((resolve, reject) => {
    resolveTask = resolve;
    rejectTask = reject;
  });

  const task = {
    code,
    key,
    order: taskOrder += 1,
    priority: normalizedPriority,
    reject: rejectTask,
    resolve: resolveTask,
    started: false,
    theme,
  };

  inflightTasks.set(key, { promise, task });
  pendingTasks.push(task);
  scheduleQueueProcessing();
  return promise;
};

export const prewarmMermaidTheme = ({ code, theme }) =>
  renderMermaidSvg({ code, theme, priority: 'low' }).catch(() => null);

export const prewarmAlternateMermaidTheme = ({ code, theme }) =>
  prewarmMermaidTheme({ code, theme: getAlternateTheme(theme) });

export const clearMermaidRenderCacheForCode = (code) => {
  for (const theme of THEMES) {
    svgCache.delete(getCacheKey({ code, theme }));
  }
};

export const __resetMermaidRendererForTests = () => {
  mermaidPromise = null;
  activeTheme = null;
  isProcessing = false;
  isProcessScheduled = false;
  taskOrder = 0;
  renderId = 0;
  svgCache.clear();
  inflightTasks.clear();
  pendingTasks.length = 0;
};

export const __setMermaidLoaderForTests = (loader) => {
  loadMermaid = loader;
  mermaidPromise = null;
};
