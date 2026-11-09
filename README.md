# MJJ (NodeSeek / DeepFlood 全能浏览器插件 & 油猴脚本)

集成以下四大核心能力的全能增强套件（同时支持 **Chrome / Edge Manifest V3 浏览器插件** 与 **Tampermonkey 油猴脚本**）：

1. **核心论坛增强**：自动签到、瀑布流下拉加载、快捷评论、关键字高亮/屏蔽、浏览历史、Callout 语法渲染、图片灯箱、名望诊断系统、好友/黑名单管理、NodeImage 图床上传等。
2. **低等级账号发帖模糊屏蔽 (`blockLowLevelPosts`)**：自动识别列表页低等级楼主（默认 `< Lv 2`，支持 `Lv 1 ~ Lv 6` 自定义）并对帖子做高斯模糊弱化处理，**鼠标移动上去立即恢复清晰可见**（支持在「⚙️ 高级设置 → 🚫 过滤设置」中切换模糊/折叠/隐藏及调节模糊像素）。
3. **用户 AI 画像与深度交易分析 (`nodeseek-ai-profile` v2.8.1)**：支持 DeepSeek / OpenAI / OpenAI-Compatible 多供应商用户画像、历史交易深挖、管理记录速查、多图床分享与长任务跨刷新运行。
4. **NS-DF 私信本地缓存与云备份 (`ns-df-chat-backup` v2.0.0)**：私信对话自动缓存至本地 IndexedDB，并支持 WebDAV（坚果云等）与 Cloudflare R2 Worker 自动备份与一键恢复。

---

## 📦 方式一：安装 Chrome / Edge 浏览器插件（推荐桌面端）

1. 在 [Releases](https://github.com/Youngv/MJJ/releases) 页面下载最新的 **`MJJ-extension-v1.1.0.zip`** 并解压到本地文件夹。
2. 打开 Chrome 或 Edge 浏览器，访问 `chrome://extensions/`（或 `edge://extensions/`）。
3. 开启右上角的 **「开发者模式 (Developer mode)」**。
4. 点击左上角 **「加载已解压的扩展程序 (Load unpacked)」**，选择刚才解压出来的 `MJJ` 文件夹即可生效。
5. 在 NodeSeek / DeepFlood 页面点击浏览器右上角插件图标 `M`，即可呼出快捷控制面板（高级设置、AI 画像设置、私信备份设置、立即备份、历史聊天记录、自动签到开关等）。

---

## 🐵 方式二：安装 Tampermonkey / Violentmonkey 油猴脚本

点击下方链接即可直接触发油猴一键安装（支持自动更新）：
- [点此安装 `MJJ.user.js`](https://github.com/Youngv/MJJ/raw/main/MJJ.user.js)
