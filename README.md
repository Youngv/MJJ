# MJJ (NodeSeek / DeepFlood 全能浏览器插件 & 油猴脚本)

> 📌 **脚本来源致谢（整合自以下开源脚本）**：
> - **Nodeseek Pro**: <https://greasyfork.org/zh-CN/scripts/567109-nodeseek-pro>
> - **nodeseek-ai-profile**: <https://github.com/yellow13441/nodeseek-ai-profile>
> - **ns-df-chat-backup**: <https://github.com/likesrt/ns-df-chat-backup>

集成以下四大核心能力与全新重构的 **MJJ 控制中心**（同时支持 **Chrome / Edge Manifest V3 浏览器插件** 与 **Tampermonkey 油猴脚本**）：

1. **🎛️ 全新重构「MJJ 控制中心」(v1.4.7)**：
   - **三处快捷唤起**：论坛顶部导航栏右侧 `⚙️` 图标、快捷键 `Alt + M`、浏览器插件 Popup 面板 / 油猴菜单。
   - **修改即生效（Auto-Save）**：告别繁琐的手动保存按钮，所有开关、分段单选、下拉框、数值、配色修改后自动保存并实时热更新生效。
   - **全局实时搜索**：顶部内置搜索框，输入关键词即可跨分类秒级定位任意功能模块与子设置项。
   - **三合一管理工作台**：一站式统管数据概览看板、AI 画像配置、WebDAV/R2 私信云备份、历史私信记录、关键词/黑名单/浏览历史快捷抽屉与等级缓存清理。
2. **🛡️ 低等级账号发帖模糊屏蔽 (`blockLowLevelPosts`)**：自动识别列表页低等级楼主（默认 `< Lv 2`，支持 `Lv 1 ~ Lv 6` 自定义）并对帖子做高斯模糊弱化处理，**鼠标移动上去立即恢复清晰可见**（支持切换模糊/折叠/隐藏及调节模糊像素）。
3. **🤖 用户 AI 画像与深度交易分析 (`nodeseek-ai-profile` v2.8.1)**：支持 DeepSeek / OpenAI / OpenAI-Compatible 多供应商用户画像、历史交易深挖、管理记录速查、多图床分享与长任务跨刷新运行。
4. **💬 NS-DF 私信本地缓存与云备份 (`ns-df-chat-backup` v2.0.0)**：私信对话自动缓存至本地 IndexedDB，并支持在任意页面直接打开 WebDAV / Cloudflare R2 备份设置与历史私信记录。

---

## 📦 方式一：安装 Chrome / Edge 浏览器插件（推荐桌面端）

1. 在 [Releases](https://github.com/Youngv/MJJ/releases) 页面下载最新的 **`MJJ-extension-v1.4.7.zip`** 并解压到本地文件夹。
2. 打开 Chrome 或 Edge 浏览器，访问 `chrome://extensions/`（或 `edge://extensions/`）。
3. 开启右上角的 **「开发者模式 (Developer mode)」**。
4. 点击左上角 **「加载已解压的扩展程序 (Load unpacked)」**，选择刚才解压出来的文件夹即可生效。
5. 在 NodeSeek / DeepFlood 页面可点击论坛顶部导航栏右侧 `⚙️` 图标、按 `Alt + M`，或点击浏览器右上角插件图标呼出 **MJJ 控制中心**。

---

## 🐵 方式二：安装 Tampermonkey / Violentmonkey 油猴脚本

点击下方链接即可直接触发油猴一键安装（支持自动更新）：
- [点此安装 `MJJ.user.js`](https://github.com/Youngv/MJJ/raw/main/MJJ.user.js)
