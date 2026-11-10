// MJJ - ISOLATED World Bridge (content-bridge.js)
(function () {
  "use strict";

  const STORAGE_PREFIX = "nsx_gm:";
  const MIRROR_LS_KEY = "__nsx_ext_gm_mirror_v1__";

  const resourceUrls = {
    highlightStyle: chrome.runtime.getURL("vendor/atom-one-light.min.css"),
    highlightStyle_dark: chrome.runtime.getURL("vendor/atom-one-dark.min.css")
  };

  function dispatchToMain(type, detail) {
    window.dispatchEvent(
      new CustomEvent("__NSX_BRIDGE_TO_MAIN__", {
        detail: JSON.stringify({ type, detail })
      })
    );
  }

  // 1. Hydrate GM storage from chrome.storage.local and keep mirror in localStorage for 0ms sync startup
  chrome.storage.local.get(null, (allItems) => {
    const gmData = {};
    if (allItems && typeof allItems === "object") {
      for (const [k, v] of Object.entries(allItems)) {
        if (k.startsWith(STORAGE_PREFIX)) {
          gmData[k.slice(STORAGE_PREFIX.length)] = v;
        }
      }
    }
    try {
      localStorage.setItem(MIRROR_LS_KEY, JSON.stringify(gmData));
    } catch {}
    dispatchToMain("INIT_STORAGE", { gmData, resourceUrls });
  });

  // 2. Listen for cross-tab storage updates -> fire GM_addValueChangeListener in MAIN world
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    for (const [fullKey, change] of Object.entries(changes)) {
      if (!fullKey.startsWith(STORAGE_PREFIX)) continue;
      const key = fullKey.slice(STORAGE_PREFIX.length);
      dispatchToMain("STORAGE_CHANGED", {
        key,
        oldValue: change.oldValue,
        newValue: change.newValue
      });
    }
  });

  // 3. Listen for requests from MAIN world
  window.addEventListener("__NSX_MAIN_TO_BRIDGE__", (e) => {
    let payload;
    try {
      payload = typeof e.detail === "string" ? JSON.parse(e.detail) : e.detail;
    } catch {
      return;
    }
    if (!payload || !payload.type) return;

    if (payload.type === "GM_SET_VALUE") {
      const { key, value } = payload;
      chrome.storage.local.set({ [STORAGE_PREFIX + key]: value });
      return;
    }

    if (payload.type === "GM_DELETE_VALUE") {
      const { key } = payload;
      chrome.storage.local.remove(STORAGE_PREFIX + key);
      return;
    }

    if (payload.type === "GM_OPEN_IN_TAB") {
      chrome.runtime.sendMessage({
        type: "NSX_OPEN_TAB",
        url: payload.url,
        active: payload.active
      });
      return;
    }

    if (payload.type === "GM_NOTIFICATION") {
      chrome.runtime.sendMessage({
        type: "NSX_NOTIFICATION",
        title: payload.title,
        text: payload.text
      });
      return;
    }

    if (payload.type === "GM_XHR_ABORT") {
      chrome.runtime.sendMessage({
        type: "NSX_XHR_ABORT",
        reqId: payload.reqId
      });
      return;
    }

    if (payload.type === "GM_XHR") {
      const { reqId, details } = payload;
      chrome.runtime.sendMessage(
        { type: "NSX_XHR", reqId, details },
        (resp) => {
          const err = chrome.runtime.lastError;
          if (err) {
            dispatchToMain("XHR_RESULT", {
              reqId,
              res: { ok: false, error: err.message || "Extension message error" }
            });
            return;
          }
          dispatchToMain("XHR_RESULT", { reqId, res: resp || { ok: false, error: "Empty response" } });
        }
      );
    }
  });

  // 4. Listen for Popup menu & action requests
  let pendingMenuCallbacks = new Map();
  window.addEventListener("__NSX_MAIN_MENU_LIST__", (e) => {
    let data;
    try {
      data = typeof e.detail === "string" ? JSON.parse(e.detail) : e.detail;
    } catch {
      return;
    }
    const cb = pendingMenuCallbacks.get(data?.reqId);
    if (cb) {
      pendingMenuCallbacks.delete(data.reqId);
      cb({ menus: data.menus || [], status: data.status || null });
    }
  });

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type === "POPUP_GET_MENUS") {
      const reqId = "m_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
      const timer = setTimeout(() => {
        if (pendingMenuCallbacks.has(reqId)) {
          pendingMenuCallbacks.delete(reqId);
          sendResponse({ menus: [], status: null });
        }
      }, 800);
      pendingMenuCallbacks.set(reqId, (payload) => {
        clearTimeout(timer);
        sendResponse(payload);
      });
      dispatchToMain("GET_MENUS", { reqId });
      return true;
    }

    if (msg?.type === "POPUP_RUN_MENU") {
      dispatchToMain("RUN_MENU", { id: msg.id });
      sendResponse({ ok: true });
      return false;
    }

    if (msg?.type === "POPUP_ACTION") {
      dispatchToMain("POPUP_ACTION", {
        action: msg.action,
        tab: msg.tab,
        cardKey: msg.cardKey,
        drawer: msg.drawer
      });
      sendResponse({ ok: true });
      return false;
    }
    return false;
  });
})();
