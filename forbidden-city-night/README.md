# 故宫 · 夜游

沿故宫中轴线展开的程序化第一人称 3D 夜游。场景由 Three.js 几何、材质、灯光与粒子实时构建，不依赖外部模型、贴图或后端服务。

![故宫 · 夜游预览](./assets/preview.webp)

[在线体验](https://wisewong.com/projects/forbidden-city-night/) · [Wise Labs](https://github.com/WiseWong6/wise-labs)

## 操作

| 输入 | 行为 |
|---|---|
| 鼠标 | 调整视角 |
| `W` `A` `S` `D` | 行走 |
| `Shift` | 疾走 |
| `F` | 切换步行 / 飞行 |
| `Space` / `C` | 飞行时升 / 降 |
| `Esc` | 退出指针锁定并呼出帮助 |

Pointer Lock 和键盘漫游需要桌面浏览器。手机端会显示桌面体验提示，不提供触控漫游。

## 本地运行

这个项目是零构建静态页面。请从 `wise-labs` 仓库根目录启动 HTTP 服务：

```bash
python3 -m http.server 8080
```

然后打开：

```text
http://127.0.0.1:8080/forbidden-city-night/
```

不要直接通过 `file://` 双击打开，ES Modules 和浏览器安全策略需要 HTTP 服务。

## 发布边界

仓库只包含运行时需要的文件：

- `index.html`
- `src/` 中的场景、控制、材质、粒子、人物和建筑构建器
- Three.js r185 核心 ES Modules
- 辉光后期处理依赖闭包中的 10 个 addons
- 预览图和许可证

不包含 `node_modules`、包管理文件、截图、视频、日志、输出目录、数据库或本地调试全局。

## 许可证

项目代码使用 [MIT License](./LICENSE)。Three.js r185 同样使用 MIT License，详见 [第三方说明](./THIRD-PARTY-NOTICES.md) 与 [vendor/three/LICENSE](./vendor/three/LICENSE)。
