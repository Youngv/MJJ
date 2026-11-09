// Nodeseek Pro All-in-One - Popup Controller
document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("menu-container");

  const renderNotSupported = () => {
    container.innerHTML = `
      <div class="empty">
        当前标签页不是 NodeSeek 或 DeepFlood。<br>请先打开论坛页面后再使用快捷菜单：
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

    const loadMenus = () => {
      chrome.tabs.sendMessage(tab.id, { type: "POPUP_GET_MENUS" }, (resp) => {
        if (chrome.runtime.lastError || !resp?.menus?.length) {
          container.innerHTML = `<div class="empty">页面正在加载中，请稍候或刷新当前论坛页面后重试。</div>`;
          return;
        }
        container.innerHTML = "";
        resp.menus.forEach((item) => {
          const btn = document.createElement("button");
          btn.className = "menu-btn";
          btn.innerHTML = `<span>${item.label.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]))}</span><span style="opacity:0.45">›</span>`;
          btn.addEventListener("click", () => {
            chrome.tabs.sendMessage(tab.id, { type: "POPUP_RUN_MENU", id: item.id }, () => {
              // If it's a state-switching toggle (like 自动签到 / 新标签页打开帖子), refresh menu labels; otherwise close popup
              if (item.label.includes(":")) {
                setTimeout(loadMenus, 80);
              } else {
                window.close();
              }
            });
          });
          container.appendChild(btn);
        });
      });
    };

    loadMenus();
  } catch {
    renderNotSupported();
  }
});
