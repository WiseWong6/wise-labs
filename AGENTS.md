# PDF Format Viewer - Agent 开发记录

## 🔧 PaddleOCR Prompt 修复

### 修复时间
2026-03-06

### 问题描述
PaddleOCR-VL-1.5 在 SiliconFlow 平台调用时识别效果差，经常返回 `[UNREADABLE]` 或空内容。

### 根因分析
原代码使用了过于复杂的 prompt：
```typescript
const defaultPrompt = /paddleocr/i.test(modelId)
  ? 'You are an OCR engine. Extract text strictly from the image. Preserve Chinese text and table structure. Do not invent content and do not repeat tokens to fill blanks. For unreadable cells use [UNREADABLE]. Output clean markdown only.'
  : '<image>\n<|grounding|>Convert the document to markdown.';
```

问题：
1. **Prompt 太长**：0.9B 轻量模型难以理解复杂指令
2. **未使用官方推荐格式**：PaddleOCR 官方推荐简洁的 Task Prompt
3. **过于严格**：`[UNREADABLE]` 要求导致模型过度保守

### 修复方案

#### 1. 添加专用 Prompt 生成函数
```typescript
const getPaddleOcrPrompt = (docType?: string): string => {
  // 根据文档类型选择最佳 prompt
  if (docType?.includes('table') || docType?.includes('清单')) {
    return 'Table Recognition:';
  }
  if (docType?.includes('formula') || docType?.includes('公式')) {
    return 'Formula Recognition:';
  }
  if (docType?.includes('chart') || docType?.includes('图表')) {
    return 'Chart Recognition:';
  }
  if (docType?.includes('seal') || docType?.includes('印章')) {
    return 'Seal Recognition:';
  }
  // 默认 OCR，适用于普通医疗票据
  return 'OCR:';
};
```

#### 2. 修改调用逻辑
```typescript
const isPaddleOcr = /paddleocr/i.test(modelId);
const defaultPrompt = isPaddleOcr
  ? getPaddleOcrPrompt(docType)  // 使用简洁 prompt
  : '<image>\n<|grounding|>Convert the document to markdown.';
```

#### 3. 调整温度参数
```typescript
temperature: isPaddleOcr ? 0.1 : 0.0,
// PaddleOCR 使用稍高的 temperature (0.1) 给 0.9B 模型一些灵活性
// DeepSeek-OCR 保持 0.0 以获得确定性输出
```

#### 4. 添加 docType 支持
修改 `OcrTaskContext` 接口：
```typescript
export interface OcrTaskContext {
  providerId?: OcrProviderId;
  modelId?: string;
  docType?: string;  // 新增：文档类型提示
}
```

### 官方参考

根据 PaddleOCR-VL-1.5 官方文档：
```python
PROMPTS = {
    "ocr": "OCR:",
    "table": "Table Recognition:",
    "formula": "Formula Recognition:",
    "chart": "Chart Recognition:",
    "spotting": "Spotting:",
    "seal": "Seal Recognition:",
}
```

官方明确说明：简洁的 Task Prompt 最适合 0.9B 轻量模型。

### 修复文件
- `pdf_format_viewer/services/ocrService.ts`
  - 新增 `getPaddleOcrPrompt()` 函数
  - 修改 `callSiliconFlowOcr()` 函数
  - 更新 `OcrTaskContext` 接口
  - 修改 `callOcrModel()` 函数

### 预期效果
- PaddleOCR 识别率提升
- 减少 `[UNREADABLE]` 返回
- 印章识别可切换到 `Seal Recognition:` 策略

---

## 📋 原项目信息

本项目是 React + TypeScript 开发的 Web OCR 工具，支持：
- PDF / 图片上传
- 多模型 OCR 识别（DeepSeek-OCR / PaddleOCR / GLM-OCR）
- 版式还原与表格重构
- 实时预览和编辑

详见原项目文档。
