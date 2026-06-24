# HTML PPT组件

面向 AI 生成 PPT / 文档网页的 HTML 组件图册。它把常见的内容排版、对比评估、流程时序、结构关系和数据图表组件整理成可浏览、可预览、可复制的静态页面。

![HTML PPT组件预览](./assets/preview.webp)

## 特性

- 零依赖静态页面，不需要安装 npm 依赖或构建流程
- 按分类浏览 61 个 HTML PPT 组件
- 支持查看组件预览和详情
- 支持一键复制 HTML 源码
- 保留雷达图、金字塔等组件的 ECharts 参考来源链接

## 运行方式

从 `wise-labs` 仓库根目录启动本地静态服务：

```bash
python3 -m http.server 8080
```

然后打开：

```text
http://127.0.0.1:8080/html-ppt-components/
```

## ECharts 说明

ECharts 只作为雷达图和金字塔组件的参考来源链接出现，不作为运行时依赖。本项目不会加载 ECharts，也不需要安装任何图表库。

## License

MIT License
