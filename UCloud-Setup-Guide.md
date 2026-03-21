# UCloud DeepSeek-OCR-2 网页端配置指南

## 🚀 已完成的配置

网页端 `phase1-ocr-experience.html` 已更新支持 **UCloud DeepSeek-OCR-2**。

### 修改内容

| 修改项 | 原配置 | 新配置 |
|--------|--------|--------|
| 默认供应商 | SiliconFlow | **UCloud** |
| 默认模型 | DeepSeek-OCR | **DeepSeek-OCR-2** |
| API端点 | api.siliconflow.cn | **api.modelverse.cn** |

## 📋 使用步骤

### 1. 打开网页

直接在浏览器中打开文件：
```
file:///Users/wisewong/Documents/Developer/OCR/pdf_format_viewer/phase1-ocr-experience.html
```

### 2. 配置 API Key

1. 点击左上角的 **「设置」** 按钮
2. 在 UCloud 行中：
   - **勾选**「可用」复选框
   - **输入** API Key: `NIUKZNKO470mfIL956006d00-64a1-45B3-a4c6-B5468f3b`
   - **勾选**「DeepSeek-OCR-2」模型
3. 点击 **「保存」**

### 3. 开始使用

1. 点击 **「上传文件」** 选择 PDF 或图片
2. 在弹出的窗口中选择 **DeepSeek-OCR-2** 模型
3. 点击 **「确认开始解析」**

## 🔧 技术细节

### UCloud API 特点

- **Base URL**: `https://api.modelverse.cn/v1`
- **模型ID**: `deepseek-ai/DeepSeek-OCR-2`
- **Message格式**: text 在前，image 在后（与SiliconFlow相反）

### 支持的文件格式

- PDF 文件
- PNG / JPG / JPEG 图片

## 🎯 优势

相比 SiliconFlow 的 DeepSeek-OCR：
- ✅ 识别出更多字段（票据号码、校验码、开票日期）
- ✅ 表格结构更清晰
- ✅ 响应速度更快

## 📝 注意事项

1. API Key 保存在浏览器 localStorage 中
2. 如果更换浏览器或清除缓存，需要重新配置
3. 支持同时启用多个供应商（UCloud + SiliconFlow + BigModel）
