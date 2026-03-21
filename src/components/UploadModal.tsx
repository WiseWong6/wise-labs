import React, { useState, useMemo, useCallback } from 'react';
import { Task, SourceFile, UploadConfigItem } from '../types';
import { generateId, formatFileSize } from '../utils/helpers';
import { getAvailableOcrModels } from '../services/configAdapter';
import { useStore, buildModelKey, getOpenModelsForProvider } from '../state/store';

const UploadModal: React.FC = () => {
  const { state, dispatch, taskQueue } = useStore();

  // --------------- Available models ---------------
  const uploadAvailableModels = useMemo(
    () =>
      state.enabledProviderIds.flatMap((pid) =>
        getOpenModelsForProvider(pid, state.enabledModelsByProvider)
      ),
    [state.enabledProviderIds, state.enabledModelsByProvider]
  );

  // --------------- Local page-range state ---------------
  // Map from UploadConfigItem.id -> { rangeMode, customPages }
  const [rangeConfigs, setRangeConfigs] = useState<
    Record<string, { rangeMode: 'all' | 'custom'; customPages: string }>
  >(() => {
    const init: Record<string, { rangeMode: 'all' | 'custom'; customPages: string }> = {};
    for (const item of state.pendingUploads) {
      init[item.id] = { rangeMode: item.rangeMode, customPages: item.customPages };
    }
    return init;
  });

  const updateRange = useCallback(
    (id: string, updates: Partial<{ rangeMode: 'all' | 'custom'; customPages: string }>) => {
      setRangeConfigs((prev) => ({
        ...prev,
        [id]: { ...prev[id], ...updates },
      }));
    },
    []
  );

  // --------------- Helpers ---------------
  const isPdf = (file: File) =>
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  const pdfItems = useMemo(
    () => state.pendingUploads.filter((u) => isPdf(u.file)),
    [state.pendingUploads]
  );

  const selectedKeys = state.selectedModelKeys;

  const toggleModelKey = useCallback(
    (key: string) => {
      const next = selectedKeys.includes(key)
        ? selectedKeys.filter((k) => k !== key)
        : [...selectedKeys, key];
      dispatch({ type: 'SET_SELECTED_MODEL_KEYS', keys: next });
    },
    [selectedKeys, dispatch]
  );

  const totalTaskCount = state.pendingUploads.length * selectedKeys.length;

  // --------------- Sync first PDF range to all ---------------
  const syncRangeToAll = useCallback(() => {
    if (pdfItems.length === 0) return;
    const first = rangeConfigs[pdfItems[0].id];
    if (!first) return;
    setRangeConfigs((prev) => {
      const next = { ...prev };
      for (const item of pdfItems) {
        next[item.id] = { rangeMode: first.rangeMode, customPages: first.customPages };
      }
      return next;
    });
  }, [pdfItems, rangeConfigs]);

  // --------------- Remove a pending file ---------------
  const removePendingFile = useCallback(
    (id: string) => {
      dispatch({ type: 'REMOVE_PENDING_UPLOAD', id });
      setRangeConfigs((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    [dispatch]
  );

  // --------------- Confirm ---------------
  const handleConfirm = useCallback(() => {
    if (selectedKeys.length === 0) return;
    if (state.pendingUploads.length === 0) return;

    const newSources: SourceFile[] = [];
    const newTasks: Task[] = [];

    for (const item of state.pendingUploads) {
      const rc = rangeConfigs[item.id] || { rangeMode: 'all', customPages: '' };

      const source: SourceFile = {
        id: generateId('src-'),
        name: item.file.name,
        sizeLabel: formatFileSize(item.file.size),
        lastModified: item.file.lastModified,
        originalFile: item.file,
        pdfUrl: URL.createObjectURL(item.file),
        pageRange: rc.rangeMode === 'custom' ? rc.customPages || 'all' : 'all',
        pageMap: [1],
      };
      newSources.push(source);

      for (const key of selectedKeys) {
        const [providerId, modelId] = key.split('::');
        const modelConfig = uploadAvailableModels.find(
          (m) => m.providerId === providerId && m.modelId === modelId
        );
        if (!modelConfig) continue;

        const task: Task = {
          id: generateId('task-'),
          type: 'ocr',
          groupId: source.id,
          sourceFileId: source.id,
          fileName: source.name,
          providerId: modelConfig.providerId,
          providerLabel: modelConfig.providerLabel,
          modelId: modelConfig.modelId,
          modelLabel: modelConfig.modelLabel,
          status: 'queued',
          statusMessage: '等待处理...',
          pagesData: {},
        };
        newTasks.push(task);
      }
    }

    dispatch({ type: 'ADD_SOURCE_FILES', files: newSources });
    dispatch({ type: 'ADD_TASKS', tasks: newTasks });

    if (newSources.length > 0) {
      dispatch({ type: 'SET_ACTIVE_GROUP', groupId: newSources[0].id });
    }

    taskQueue.enqueueBatch(newTasks);

    // Clean up and close
    dispatch({ type: 'SET_PENDING_UPLOADS', items: [] });
    dispatch({ type: 'SET_UPLOAD_OPEN', open: false });
  }, [selectedKeys, state.pendingUploads, rangeConfigs, uploadAvailableModels, dispatch, taskQueue]);

  // --------------- Cancel ---------------
  const handleCancel = useCallback(() => {
    dispatch({ type: 'SET_PENDING_UPLOADS', items: [] });
    dispatch({ type: 'SET_UPLOAD_OPEN', open: false });
  }, [dispatch]);

  // --------------- Render ---------------
  if (!state.uploadOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm modal-overlay">
      <div className="bg-white rounded-2xl shadow-modal w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col modal-panel">
        {/* ---- Header ---- */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">上传配置</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              已选择 {state.pendingUploads.length} 个文件，请选择 OCR 模型并配置页面范围
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-all duration-150 p-1.5 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ---- Body ---- */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* ===== Model Selection ===== */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 mb-3">OCR 模型</h3>
            {uploadAvailableModels.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                暂无可用模型。请在设置中启用至少一个供应商和模型。
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {uploadAvailableModels.map((model) => {
                  const key = buildModelKey(model.providerId, model.modelId);
                  const selected = selectedKeys.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleModelKey(key)}
                      className={`
                        relative flex items-start gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all duration-150 active:scale-[0.98]
                        ${
                          selected
                            ? 'border-indigo-500 bg-indigo-50 shadow-sm shadow-indigo-200 ring-1 ring-indigo-500/30'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 hover:shadow-card'
                        }
                      `}
                    >
                      {/* Checkbox indicator */}
                      <span
                        className={`
                          mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-150
                          ${selected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300 bg-white'}
                        `}
                      >
                        {selected && (
                          <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>

                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${selected ? 'text-indigo-900' : 'text-gray-900'}`}>
                          {model.modelLabel}
                        </p>
                        <p className={`text-xs mt-0.5 ${selected ? 'text-indigo-600' : 'text-gray-500'}`}>
                          {model.providerLabel}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* ===== Page Range Configuration ===== */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">页面范围</h3>
              {pdfItems.length > 1 && (
                <button
                  onClick={syncRangeToAll}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                >
                  同步到全部 PDF
                </button>
              )}
            </div>

            <div className="space-y-2">
              {state.pendingUploads.map((item) => {
                const filePdf = isPdf(item.file);
                const rc = rangeConfigs[item.id] || { rangeMode: 'all', customPages: '' };

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white shadow-card px-4 py-2.5 hover:shadow-card-hover transition-shadow duration-200"
                  >
                    {/* File icon */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-50 to-violet-50">
                      <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                    </div>

                    {/* File name + size */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-900 truncate" title={item.file.name}>
                        {item.file.name}
                      </p>
                      <p className="text-xs text-gray-400">{formatFileSize(item.file.size)}</p>
                    </div>

                    {/* Range controls */}
                    {filePdf ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={rc.rangeMode}
                          onChange={(e) =>
                            updateRange(item.id, { rangeMode: e.target.value as 'all' | 'custom' })
                          }
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-150"
                        >
                          <option value="all">全部解析</option>
                          <option value="custom">指定范围</option>
                        </select>
                        {rc.rangeMode === 'custom' && (
                          <input
                            type="text"
                            value={rc.customPages}
                            onChange={(e) => updateRange(item.id, { customPages: e.target.value })}
                            placeholder="如 1-3,5"
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 w-24 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-150"
                          />
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 shrink-0">自动解析</span>
                    )}

                    {/* Remove button */}
                    <button
                      onClick={() => removePendingFile(item.id)}
                      className="shrink-0 text-gray-400 hover:text-red-500 transition-all duration-150 p-0.5 rounded hover:bg-red-50"
                      title="移除文件"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* ---- Footer ---- */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          <p className="text-sm text-gray-500">
            {selectedKeys.length > 0 && state.pendingUploads.length > 0 ? (
              <>
                将创建{' '}
                <span className="font-medium text-gray-700">{totalTaskCount}</span>{' '}
                个任务（{state.pendingUploads.length} 文件 &times; {selectedKeys.length} 模型）
              </>
            ) : (
              <span className="text-amber-600">请至少选择一个模型</span>
            )}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-150 active:scale-[0.97]"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedKeys.length === 0 || state.pendingUploads.length === 0}
              className={`
                px-5 py-2 text-sm font-medium rounded-lg transition-all duration-150 active:scale-[0.97]
                ${
                  selectedKeys.length > 0 && state.pendingUploads.length > 0
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 shadow-sm shadow-indigo-200'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              创建任务
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
