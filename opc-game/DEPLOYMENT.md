# 部署与人工验收

## Web 静态部署

```bash
npm ci
npm run check
```

将 `web/dist/` 作为普通静态目录交给 Nginx，不需要 Node.js、Express、数据库或运行时环境变量。

最小 Nginx 配置示例：

```nginx
location /opc-game/ {
  alias /srv/www/opc-game/;
  try_files $uri $uri/ /opc-game/index.html;
}
```

若部署在 `/opc-game/` 子路径，构建时执行 `npm --workspace @opc-game/web run build -- --base=/opc-game/`。

## 微信小程序

1. 执行 `npm ci && npm run sync:mini && npm run typecheck`。
2. 用微信开发者工具打开仓库根目录。
3. 核对项目名 `opc-game` 与 AppID `wx03f611286aacbfc4`。
4. 分别使用 iOS、Android 模拟器及真机完整走一遍 25 题，并覆盖 Q3 为爱发电跳题、Q13 登录条件题和 Q19～Q21 连续合规关。
5. 核对调试器 Network 面板没有业务请求，启动时没有登录或用户资料授权弹窗。
6. 在中途关闭并重新进入，确认答案、账单和结局均已清空。
7. 核对右上角分享菜单没有分享给朋友或朋友圈入口。

## Web 人工检查

- 1440 × 900、390 × 844 与 320 × 568 三个验收视口。
- 根路径 `/` 即街机版游戏入口，可直接打开。
- 桌面使用全屏场景与 HUD 叠加，在手机使用场景、题卡纵向布局；HUD 显示状态机中的真实资金、关键路径天数和得分。Q01～Q25 必须分别加载唯一的桌面或手机母板，隐藏题目文字后仍能通过核心装置区分场景。
- 每题四态顺序固定为 `idle / action / resolved / quit`；普通选择先显示本题动作，再进入完成态和实际下一题，退出留在当前题退出态。结果页使用 Q25 完成态作为主背景。
- Network 面板中只应出现当前题和实际下一题的响应式资产；桌面不下载手机母板，手机不下载桌面母板，也不能一次下载 50 张。
- Tab、Enter 以及数字键 `1`～`4` 可完成选择；返回重选后费用、得分、路线和场景均从历史重放恢复。
- 系统开启“减少动态效果”后，过关不等待动画。
- 刷新后回到首页，浏览器存储中没有业务数据。
