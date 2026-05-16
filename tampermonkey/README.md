# AI Council Bridge - Tampermonkey 脚本安装说明

## 安装步骤

1. 安装 Chrome 扩展 [Tampermonkey](https://www.tampermonkey.net/)
2. 点击 Tampermonkey 图标 → "创建新脚本"
3. 将 `ai-council-bridge.js` 内容粘贴到编辑器中
4. 保存（Ctrl+S / Cmd+S）
5. 打开 ChatGPT / Claude / Gemini 网页，确认脚本已启用
6. 启动 AI Council 应用，桥接自动建立

## 工作原理

- 油猴脚本在 AI 网页中注入后，自动连接到 AI Council 应用的本地 WebSocket 服务（localhost:19280）
- 应用可以通过 WebSocket 向脚本发送指令（输入文本、读取回复、查询状态）
- 脚本操作网页 DOM 完成交互，并将结果返回给应用
