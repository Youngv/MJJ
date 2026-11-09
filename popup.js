// MJJ - Popup Controller
document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("menu-container");

  const esc = (s) =>
    String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const renderNotSupported = () => {
    container.innerHTML = `
      <div class="empty">
        当前标签页不是 NodeSeek 或 DeepFlood。<br>请先打开论坛页面后再使用控制面板：
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

    const runCmd = (id, keepOpen = false) => {
      chrome.tabs.sendMessage(tab.id, { type: "POPUP_RUN_MENU", id }, () => {
        if (keepOpen) {
          setTimeout(loadMenus, 80);
        } else {
          window.close();
        }
      });
    };

    const loadMenus = () => {
      chrome.tabs.sendMessage(tab.id, { type: "POPUP_GET_MENUS" }, (resp) => {
        if (chrome.runtime.lastError || !resp?.menus?.length) {
          container.innerHTML = `<div class="empty">页面正在加载中，请稍候或刷新当前论坛页面后重试。</div>`;
          return;
        }
        const menus = resp.menus;
        const ccItem = menus.find((m) => m.label.includes("MJJ 控制中心") || m.label.includes("高级设置"));
        const otherMenus = menus.filter((m) => m !== ccItem);

        container.innerHTML = "";

        if (ccItem) {
          const hero = document.createElement("button");
          hero.className = "hero-btn";
          hero.innerHTML = `<span>🎛️ 打开 MJJ 控制中心</span><span class="hero-hint">Alt + M</span>`;
          hero.addEventListener("click", () => runCmd(ccItem.id, false));
          container.appendChild(hero);
        }

        const list = document.createElement("div");
        list.className = "menu-list";
        otherMenus.forEach((item) => {
          const isToggle = item.label.includes(":");
          const btn = document.createElement("button");
          btn.className = "menu-btn";
          btn.innerHTML = `<span>${esc(item.label)}</span><span style="opacity:0.45">${isToggle ? "⇄" : "›"}</span>`;
          btn.addEventListener("click", () => runCmd(item.id, isToggle));
          list.appendChild(btn);
        });
        container.appendChild(list);
      });
    };

    loadMenus();
  } catch {
    renderNotSupported();
  }
});
