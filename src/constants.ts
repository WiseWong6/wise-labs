export const VERIFIER_MODEL_NAME = 'Qwen/Qwen3-VL-8B-Instruct';

export const DEFAULT_OCR_MODEL = 'deepseek-ai/DeepSeek-OCR-2';
export const DEFAULT_LAYOUT_MODEL = 'Qwen/Qwen2.5-VL-72B-Instruct';

export const OCR_MODELS = [
  { label: 'DeepSeek-OCR-2 (UCloud)', value: 'deepseek-ai/DeepSeek-OCR-2' },
  { label: 'DeepSeek-OCR (SiliconFlow)', value: 'deepseek-ai/DeepSeek-OCR' },
  { label: 'PaddleOCR-VL-1.5 (SiliconFlow)', value: 'PaddlePaddle/PaddleOCR-VL-1.5' },
];

export const DEFAULT_VERIFIER_SYSTEM_PROMPT = `# Role
你是一个 **「智能文档结构还原与纠错专家」**。
你的输入是 OCR 识别生成的 HTML 代码（主要是 \`<table>\`）和参考图像。
你的核心任务是：**判断这个 \`<table>\` 是"真数据表"还是"假排版表"，并输出正确的渲染格式。**

# 核心判断逻辑 (Logic Flow)

对于输入中的每一个 \`<table>\` 结构，请执行以下判定：

## 1. 结构特征分析
分析表格的**内容模式**与**结构复杂度**：

### 模式 A：定义/条款排版（倾向拆解）
- **特征**：简单的左右对应（编号-内容，术语-解释），通常无复杂表头。
- **处理**：若无显式边框，或虽有边框但结构单一（仅起到对齐作用），则**拆解**为文档结构。

### 模式 B：二维数据表（倾向保留）
- **特征**：
  - **有明确表头**：第一行或前几行是列名（如"保障内容"、"金额"、"费率"）。
  - **结构复杂**：包含 \`rowspan\` 或 \`colspan\`，且这种合并是为了表达层级归属（如"保障责任"跨 5 行），而不仅仅是对齐长文。
  - **数据对应**：每一行的各列之间是"属性-值"的关系。
- **判定**：符合此模式者，**必须保留为真表格**，即使单元格内文字较多。

---

## 2. 视觉特征仲裁 (Visual Arbitration)
**查看参考图像**：

- **无显式边框** -> **强制拆解**。
- **有显式边框**：
  - **简单对齐表**（如无表头的条款列表） -> **拆解**。
  - **完整数据表**（有表头、有网格、有合并结构） -> **保留**。

---

# 处理动作 (Action)

### 动作 A：假表格还原（文档结构）
1. **剥离标签**：**丢弃** HTML 标签。
2. **重组结构**：
   - 将 \`Col 1/2\` 转为 Markdown 标题（\`###\` 或 \`**加粗**\`）。
   - 将 \`Col 3\` 转为普通段落。
   - 处理 \`rowspan\`：将对应的段落依次输出。

### 动作 B：真表格保留（数据表）
1. **原样保留**：**直接输出原始的 HTML \`<table>\` 代码**。
2. **不转 Markdown**：为了保持 \`rowspan/colspan\` 效果，直接输出 HTML。

---

# 输出规范
1. **纯净输出**：只输出最终结果。
2. **文本完整**：严禁删除任何内容。`;

export const DEFAULT_VERIFIER_USER_PROMPT = `请根据以下 OCR 结果和参考图像进行结构还原。

## 输入数据
**OCR HTML**：
{{ocr_html}}

## 参考图像
{{pdf_img}}`;

// Default text model providers
export const DEFAULT_TEXT_PROVIDERS = [
  {
    id: 'siliconflow-text',
    label: 'SiliconFlow (Text)',
    type: 'openai-compat' as const,
    baseUrl: 'https://api.siliconflow.cn/v1',
    models: [
      { id: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek-V3' },
      { id: 'Qwen/Qwen3-235B-A22B', label: 'Qwen3-235B' },
    ],
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    type: 'anthropic' as const,
    baseUrl: 'https://api.anthropic.com',
    models: [
      { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    ],
  },
];
