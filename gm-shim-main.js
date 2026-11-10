// MJJ - MAIN World GM_* Shim (gm-shim-main.js)
(function () {
  "use strict";

  const MIRROR_LS_KEY = "__nsx_ext_gm_mirror_v1__";
  const storeMap = new Map();
  const valueListeners = new Map(); // id -> { key, fn }
  let listenerSeq = 1;

  const menuCommands = new Map(); // id -> { id, label, cb }
  let menuSeq = 1;

  const pendingXhrs = new Map();
  let xhrSeq = 1;

  const resourceUrls = {
    highlightStyle: "https://s4.zstatic.net/ajax/libs/highlight.js/11.9.0/styles/atom-one-light.min.css",
    highlightStyle_dark: "https://s4.zstatic.net/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css"
  };

  // Load initial synchronous mirror from localStorage immediately
  try {
    const raw = localStorage.getItem(MIRROR_LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        for (const [k, v] of Object.entries(parsed)) {
          storeMap.set(k, v);
        }
      }
    }
  } catch {}

  let resolveReady;
  const readyPromise = new Promise((res) => {
    resolveReady = res;
    // Fallback timeout so scripts never hang even if bridge is delayed
    setTimeout(res, 120);
  });

  function syncMirror() {
    try {
      const obj = {};
      storeMap.forEach((v, k) => {
        obj[k] = v;
      });
      localStorage.setItem(MIRROR_LS_KEY, JSON.stringify(obj));
    } catch {}
  }

  function sendToBridge(type, payload = {}) {
    window.dispatchEvent(
      new CustomEvent("__NSX_MAIN_TO_BRIDGE__", {
        detail: JSON.stringify({ type, ...payload })
      })
    );
  }

  window.addEventListener("__NSX_BRIDGE_TO_MAIN__", (e) => {
    let msg;
    try {
      msg = typeof e.detail === "string" ? JSON.parse(e.detail) : e.detail;
    } catch {
      return;
    }
    if (!msg || !msg.type) return;

    if (msg.type === "INIT_STORAGE") {
      const { gmData, resourceUrls: rUrls } = msg.detail || {};
      if (rUrls && typeof rUrls === "object") {
        Object.assign(resourceUrls, rUrls);
      }
      if (gmData && typeof gmData === "object") {
        for (const [k, v] of Object.entries(gmData)) {
          storeMap.set(k, v);
        }
        syncMirror();
      }
      resolveReady();
      return;
    }

    if (msg.type === "STORAGE_CHANGED") {
      const { key, oldValue, newValue } = msg.detail || {};
      const prevLocal = storeMap.get(key);
      const changedRemotely = JSON.stringify(prevLocal) !== JSON.stringify(newValue);
      if (newValue === undefined) storeMap.delete(key);
      else storeMap.set(key, newValue);
      syncMirror();

      if (changedRemotely) {
        valueListeners.forEach((item) => {
          if (item.key === key && typeof item.fn === "function") {
            try {
              item.fn(key, oldValue, newValue, true);
            } catch (err) {
              console.error("[NSX GM_addValueChangeListener]", err);
            }
          }
        });
      }
      return;
    }

    if (msg.type === "XHR_RESULT") {
      const { reqId, res } = msg.detail || {};
      const entry = pendingXhrs.get(reqId);
      if (!entry) return;
      pendingXhrs.delete(reqId);
      const { details } = entry;

      if (res?.aborted) {
        details.onabort?.({ status: 0, responseText: "" });
        return;
      }
      if (res?.timeout) {
        details.ontimeout?.({ status: 0, responseText: "" });
        return;
      }
      if (!res?.ok) {
        details.onerror?.({ status: 0, statusText: res?.error || "Network Error", message: res?.error || "Network Error" });
        return;
      }

      const responseObj = {
        readyState: 4,
        status: res.status,
        statusText: res.statusText || "",
        finalUrl: res.finalUrl || details.url,
        responseHeaders: res.responseHeaders || "",
        responseText: res.responseText || "",
        response: details.responseType === "json" ? (res.responseJson ?? res.responseText) : res.responseText
      };
      details.onreadystatechange?.(responseObj);
      details.onload?.(responseObj);
      return;
    }

    if (msg.type === "GET_MENUS") {
      const reqId = msg.detail?.reqId;
      const menus = [];
      menuCommands.forEach((v) => {
        menus.push({ id: v.id, label: v.label });
      });
      let status = null;
      try {
        status = window.__nsxRuntime?.getQuickStatus?.() || null;
      } catch {}
      window.dispatchEvent(
        new CustomEvent("__NSX_MAIN_MENU_LIST__", {
          detail: JSON.stringify({ reqId, menus, status })
        })
      );
      return;
    }

    if (msg.type === "POPUP_ACTION") {
      const d = msg.detail || {};
      const rt = window.__nsxRuntime;
      if (!rt) return;
      try {
        if (d.action === "openControlCenter") rt.openControlCenter?.(d.tab || "overview", d.cardKey || "");
        else if (d.action === "triggerTopDrawer") rt.triggerTopDrawer?.(d.drawer);
        else if (d.action === "toggleSignIn") rt.toggleSignIn?.();
        else if (d.action === "toggleNewTab") rt.toggleNewTab?.();
        else if (d.action === "runChatBackupNow") rt.runChatBackupNow?.();
        else if (d.action === "exportFullConfig") rt.exportFullConfig?.();
        else if (d.action === "importFullConfig") rt.importFullConfig?.();
      } catch (err) {
        console.error("[MJJ Popup Action Error]", err);
      }
      return;
    }

    if (msg.type === "RUN_MENU") {
      const item = menuCommands.get(msg.detail?.id);
      if (item && typeof item.cb === "function") {
        try {
          item.cb();
        } catch (err) {
          console.error("[NSX Menu Command Error]", err);
        }
      }
    }
  });

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        const idx = result.indexOf(",");
        resolve(idx >= 0 ? result.slice(idx + 1) : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function serializeBody(data) {
    if (data === undefined || data === null) return null;
    if (typeof data === "string") return { kind: "text", value: data };
    if (typeof URLSearchParams !== "undefined" && data instanceof URLSearchParams) {
      return { kind: "text", value: data.toString() };
    }
    if (typeof FormData !== "undefined" && data instanceof FormData) {
      const entries = [];
      for (const [name, value] of data.entries()) {
        if (typeof Blob !== "undefined" && value instanceof Blob) {
          const base64 = await blobToBase64(value);
          entries.push({
            type: "file",
            name,
            filename: value.name || "upload.bin",
            mime: value.type || "application/octet-stream",
            base64
          });
        } else {
          entries.push({ type: "text", name, value: String(value ?? "") });
        }
      }
      return { kind: "formdata", entries };
    }
    if (typeof Blob !== "undefined" && data instanceof Blob) {
      const base64 = await blobToBase64(data);
      return { kind: "base64", mime: data.type || "application/octet-stream", base64 };
    }
    return { kind: "text", value: typeof data === "object" ? JSON.stringify(data) : String(data) };
  }

  const GM_info = {
    script: {
      name: "MJJ",
      version: "1.4.6",
      namespace: "http://www.nodeseek.com/"
    },
    scriptHandler: "MJJExtension",
    version: "1.4.6"
  };

  function GM_getValue(key, defaultValue) {
    if (!storeMap.has(key)) return defaultValue;
    const val = storeMap.get(key);
    if (val && typeof val === "object") {
      try {
        return JSON.parse(JSON.stringify(val));
      } catch {
        return val;
      }
    }
    return val;
  }

  function GM_setValue(key, value) {
    const oldValue = storeMap.get(key);
    storeMap.set(key, value);
    syncMirror();
    sendToBridge("GM_SET_VALUE", { key, value });
    valueListeners.forEach((item) => {
      if (item.key === key && typeof item.fn === "function") {
        try {
          item.fn(key, oldValue, value, false);
        } catch (err) {
          console.error("[NSX GM_addValueChangeListener]", err);
        }
      }
    });
  }

  function GM_deleteValue(key) {
    const oldValue = storeMap.get(key);
    storeMap.delete(key);
    syncMirror();
    sendToBridge("GM_DELETE_VALUE", { key });
    valueListeners.forEach((item) => {
      if (item.key === key && typeof item.fn === "function") {
        try {
          item.fn(key, oldValue, undefined, false);
        } catch {}
      }
    });
  }

  function GM_listValues() {
    return Array.from(storeMap.keys());
  }

  function GM_addValueChangeListener(key, fn) {
    const id = listenerSeq++;
    valueListeners.set(id, { key, fn });
    return id;
  }

  function GM_removeValueChangeListener(id) {
    valueListeners.delete(id);
  }

  function GM_registerMenuCommand(label, cb) {
    // Update in place if same label already exists
    for (const [existingId, item] of menuCommands.entries()) {
      if (item.label === label) {
        item.cb = cb;
        return existingId;
      }
    }
    const id = "cmd_" + menuSeq++;
    menuCommands.set(id, { id, label, cb });
    return id;
  }

  function GM_unregisterMenuCommand(idOrLabel) {
    if (menuCommands.has(idOrLabel)) {
      menuCommands.delete(idOrLabel);
      return;
    }
    for (const [k, v] of menuCommands.entries()) {
      if (v.label === idOrLabel) menuCommands.delete(k);
    }
  }

  function GM_getResourceURL(name) {
    return resourceUrls[name] || "";
  }

  function GM_addStyle(css) {
    const style = document.createElement("style");
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
    return style;
  }

  function GM_addElement(parentOrTag, tagOrAttrs, maybeAttrs) {
    let parent = document.head || document.body || document.documentElement;
    let tag = parentOrTag;
    let attrs = tagOrAttrs || {};
    if (typeof parentOrTag !== "string") {
      parent = parentOrTag;
      tag = tagOrAttrs;
      attrs = maybeAttrs || {};
    }
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "textContent") el.textContent = v;
      else if (k === "innerHTML") el.innerHTML = v;
      else el.setAttribute(k, v);
    }
    parent.appendChild(el);
    return el;
  }

  function GM_openInTab(url, opts) {
    const active = typeof opts === "boolean" ? !opts : opts?.active !== false;
    sendToBridge("GM_OPEN_IN_TAB", { url, active });
  }

  function GM_setClipboard(data) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(String(data ?? "")).catch(() => {});
    } else {
      const ta = document.createElement("textarea");
      ta.value = String(data ?? "");
      ta.style.cssText = "position:fixed;opacity:0;pointer-events:none;";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch {}
      ta.remove();
    }
  }

  function GM_notification(detailsOrText, title) {
    if (typeof detailsOrText === "string") {
      sendToBridge("GM_NOTIFICATION", { title: title || "MJJ", text: detailsOrText });
    } else if (detailsOrText && typeof detailsOrText === "object") {
      sendToBridge("GM_NOTIFICATION", {
        title: detailsOrText.title || "MJJ",
        text: detailsOrText.text || ""
      });
      if (typeof detailsOrText.ondone === "function") {
        setTimeout(() => detailsOrText.ondone(), 100);
      }
    }
  }

  function GM_xmlhttpRequest(details) {
    const reqId = "xhr_" + xhrSeq++;
    const fullUrl = details.url?.startsWith("http")
      ? details.url
      : new URL(details.url || "", location.origin).href;

    // Fast-path same-origin requests directly in MAIN world to preserve page cookies & CF session
    let isSameOrigin = false;
    try {
      isSameOrigin = new URL(fullUrl).origin === location.origin;
    } catch {}

    if (isSameOrigin) {
      const controller = new AbortController();
      const timeoutMs = Number(details.timeout) > 0 ? Number(details.timeout) : 0;
      let timedOut = false;
      const timer = timeoutMs > 0
        ? setTimeout(() => {
            timedOut = true;
            controller.abort();
          }, timeoutMs)
        : null;

      (async () => {
        try {
          const method = (details.method || "GET").toUpperCase();
          const headers = { ...(details.headers || {}) };
          delete headers.Referer;
          delete headers.referer;
          const resp = await fetch(fullUrl, {
            method,
            headers,
            body: method !== "GET" && method !== "HEAD" ? details.data : undefined,
            credentials: "include",
            signal: controller.signal
          });
          const rawHeaders = [];
          resp.headers.forEach((v, k) => rawHeaders.push(`${k}: ${v}`));
          const responseText = await resp.text();
          let responseVal = responseText;
          if (details.responseType === "json") {
            try { responseVal = JSON.parse(responseText); } catch {}
          }
          const resObj = {
            readyState: 4,
            status: resp.status,
            statusText: resp.statusText || "",
            finalUrl: resp.url || fullUrl,
            responseHeaders: rawHeaders.join("\r\n"),
            responseText,
            response: responseVal
          };
          details.onreadystatechange?.(resObj);
          details.onload?.(resObj);
        } catch (err) {
          if (timedOut) details.ontimeout?.({ status: 0, responseText: "" });
          else if (err?.name === "AbortError") details.onabort?.({ status: 0, responseText: "" });
          else details.onerror?.({ status: 0, statusText: err?.message || "Network Error", message: err?.message || "Network Error" });
        } finally {
          if (timer) clearTimeout(timer);
        }
      })();

      return {
        abort() {
          controller.abort();
        }
      };
    }

    // Cross-origin request via Background Service Worker
    pendingXhrs.set(reqId, { details });
    (async () => {
      try {
        const bodyDesc = await serializeBody(details.data);
        sendToBridge("GM_XHR", {
          reqId,
          details: {
            url: fullUrl,
            method: details.method || "GET",
            headers: details.headers || {},
            timeout: details.timeout || 0,
            withCredentials: !!details.withCredentials,
            responseType: details.responseType || "text",
            bodyDesc
          }
        });
      } catch (err) {
        pendingXhrs.delete(reqId);
        details.onerror?.({ status: 0, message: err?.message || "Serialize error" });
      }
    })();

    return {
      abort() {
        if (pendingXhrs.has(reqId)) {
          pendingXhrs.delete(reqId);
          sendToBridge("GM_XHR_ABORT", { reqId });
          details.onabort?.({ status: 0, responseText: "" });
        }
      }
    };
  }

  window.__NSX_GM__ = {
    ready: readyPromise,
    GM_info,
    GM_getValue,
    GM_setValue,
    GM_deleteValue,
    GM_listValues,
    GM_addValueChangeListener,
    GM_removeValueChangeListener,
    GM_registerMenuCommand,
    GM_unregisterMenuCommand,
    GM_getResourceURL,
    GM_addStyle,
    GM_addElement,
    GM_openInTab,
    GM_setClipboard,
    GM_notification,
    GM_xmlhttpRequest,
    unsafeWindow: window
  };
})();
