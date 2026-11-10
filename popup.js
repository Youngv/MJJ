// MJJ - Unified Popup Controller (v1.4.4)
document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("menu-container");
  const verBadge = document.getElementById("ver-badge");

  const esc = (s) =>
    String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const renderNotSupported = () => {
    container.innerHTML = `
      <div class="empty">
        当前标签页不是 NodeSeek 或 DeepFlood。<br>请先打开论坛页面后再使用 MJJ 控制中心：
        <div class="quick-links">
          <a class="quick-link" data-url="https://www.nodeseek.com/">打开 NodeSeek</a>
          <a class="quick-link" data-url="https://www.deepflood.com/">打开 DeepFlood</a>
        </div>
      </div>
    `;
    container.querySelectorAll(".quick-link").forEach((el) => {
      el.addEventListener("click", () => {
        chrome.tabs.create({ url: el.dataset.url, active: true });
        window.close();
      });
    });
  };

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https?:\/\/www\.(nodeseek|deepflood)\.com\//i.test(tab.url || "")) {
      renderNotSupported();
      return;
    }

    const sendAction = (payload, keepOpen = false) => {
      chrome.tabs.sendMessage(tab.id, { type: "POPUP_ACTION", ...payload }, () => {
        if (keepOpen) {
          setTimeout(loadDashboard, 80);
        } else {
          window.close();
        }
      });
    };

    const loadDashboard = () => {
      chrome.tabs.sendMessage(tab.id, { type: "POPUP_GET_MENUS" }, (resp) => {
        if (chrome.runtime.lastError || !resp) {
          container.innerHTML = `<div class="empty">页面正在加载中，请稍候或刷新当前论坛页面后重试。</div>`;
          return;
        }
        const st = resp.status || {};
        if (st.version && verBadge) {
          verBadge.textContent = `v${st.version}`;
        }

        const aiSub = st.aiText ? esc(st.aiText) : "DeepSeek / OpenAI / Prompt";
        const imgSub = st.imageHostText ? esc(st.imageHostText) : "5 大图床与编辑器传图";
        const lvSub = typeof st.levelCacheCount === "number" ? `已缓存 ${st.levelCacheCount} 人等级` : "低等级发帖模糊与黑名单";
        const signPill = esc(st.signInText || "🎲 随机🍗");
        const newTabPill = esc(st.newTabText || "❌ 关闭");

        container.innerHTML = `
          <button class="hero-btn" id="btn-open-cc">
            <span>🎛️ 打开 MJJ 控制中心</span>
            <span class="hero-hint">Alt + M</span>
          </button>

          <div class="section-title">核心套件直达（内嵌统一页签）</div>
          <div class="bento-grid">
            <button class="bento-card" data-tab="ai">
              <div class="bento-title"><span>🤖 AI 画像设置</span><span>›</span></div>
              <div class="bento-sub">${aiSub}</div>
            </button>
            <button class="bento-card" data-tab="chat" data-card="chat-history-card">
              <div class="bento-title"><span>💬 私信与云备份</span><span>›</span></div>
              <div class="bento-sub">历史记录 / WebDAV & R2</div>
            </button>
            <button class="bento-card" data-tab="image">
              <div class="bento-title"><span>🖼️ 图床与上传</span><span>›</span></div>
              <div class="bento-sub">${imgSub}</div>
            </button>
            <button class="bento-card" data-tab="🚫 过滤设置" data-card="block_low_level">
              <div class="bento-title"><span>🛡️ 低等级发帖模糊</span><span>›</span></div>
              <div class="bento-sub">${lvSub}</div>
            </button>
          </div>

          <div class="section-title">顶部悬浮管理抽屉</div>
          <div class="drawer-row">
            <button class="drawer-btn" data-drawer="filter">🔍 关键词屏蔽</button>
            <button class="drawer-btn" data-drawer="relation">🤝 好友/黑名单</button>
            <button class="drawer-btn" data-drawer="history">🕘 浏览足迹</button>
          </div>

          <div class="section-title">高频状态快捷切换</div>
          <div class="status-list">
            <button class="status-btn" id="btn-toggle-sign">
              <span>🎲 自动签到模式</span>
              <span class="status-pill">${signPill}</span>
            </button>
            <button class="status-btn" id="btn-toggle-newtab">
              <span>↗️ 新标签页打开帖子</span>
              <span class="status-pill">${newTabPill}</span>
            </button>
            <button class="status-btn" id="btn-backup-chat-now">
              <span>⚡ 立即同步私信到云端</span>
              <span class="status-pill">WebDAV / R2</span>
            </button>
          </div>
        `;

        container.querySelector("#btn-open-cc")?.addEventListener("click", () => {
          sendAction({ action: "openControlCenter", tab: "overview" }, false);
        });

        container.querySelectorAll(".bento-card").forEach((btn) => {
          btn.addEventListener("click", () => {
            sendAction(
              {
                action: "openControlCenter",
                tab: btn.dataset.tab || "overview",
                cardKey: btn.dataset.card || ""
              },
              false
            );
          });
        });

        container.querySelectorAll(".drawer-btn").forEach((btn) => {
          btn.addEventListener("click", () => {
            sendAction({ action: "triggerTopDrawer", drawer: btn.dataset.drawer }, false);
          });
        });

        container.querySelector("#btn-toggle-sign")?.addEventListener("click", () => {
          sendAction({ action: "toggleSignIn" }, true);
        });

        container.querySelector("#btn-toggle-newtab")?.addEventListener("click", () => {
          sendAction({ action: "toggleNewTab" }, true);
        });

        container.querySelector("#btn-backup-chat-now")?.addEventListener("click", () => {
          sendAction({ action: "runChatBackupNow" }, false);
        });
      });
    };

    loadDashboard();
  } catch {
    renderNotSupported();
  }
});
