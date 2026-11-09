// MJJ All-in-One - Background Service Worker (MV3)

const activeRequests = new Map();

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function reconstructBody(bodyDesc) {
  if (!bodyDesc) return undefined;
  if (bodyDesc.kind === "text") return bodyDesc.value;
  if (bodyDesc.kind === "base64") {
    const bytes = base64ToUint8Array(bodyDesc.base64);
    return new Blob([bytes], { type: bodyDesc.mime || "application/octet-stream" });
  }
  if (bodyDesc.kind === "formdata") {
    const fd = new FormData();
    for (const entry of bodyDesc.entries || []) {
      if (entry.type === "file") {
        const bytes = base64ToUint8Array(entry.base64);
        const blob = new Blob([bytes], { type: entry.mime || "application/octet-stream" });
        fd.append(entry.name, blob, entry.filename || "blob");
      } else {
        fd.append(entry.name, entry.value ?? "");
      }
    }
    return fd;
  }
  return undefined;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg !== "object") return false;

  if (msg.type === "NSX_OPEN_TAB") {
    chrome.tabs.create({
      url: msg.url,
      active: msg.active !== false
    }, (tab) => {
      sendResponse({ ok: true, tabId: tab?.id });
    });
    return true;
  }

  if (msg.type === "NSX_NOTIFICATION") {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: msg.title || "MJJ",
      message: msg.text || ""
    }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === "NSX_XHR_ABORT") {
    const ctrl = activeRequests.get(msg.reqId);
    if (ctrl) {
      ctrl.abort();
      activeRequests.delete(msg.reqId);
    }
    sendResponse({ ok: true });
    return false;
  }

  if (msg.type === "NSX_XHR") {
    const { reqId, details } = msg;
    const controller = new AbortController();
    activeRequests.set(reqId, controller);

    const timeoutMs = Number(details.timeout) > 0 ? Number(details.timeout) : 0;
    let timedOut = false;
    let timer = null;
    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);
    }

    (async () => {
      try {
        const method = (details.method || "GET").toUpperCase();
        const headers = {};
        if (details.headers && typeof details.headers === "object") {
          for (const [k, v] of Object.entries(details.headers)) {
            // Skip forbidden or FormData auto-boundary headers when body is FormData
            if (details.bodyDesc?.kind === "formdata" && k.toLowerCase() === "content-type") continue;
            if (v !== undefined && v !== null) headers[k] = String(v);
          }
        }

        const fetchOpts = {
          method,
          headers,
          signal: controller.signal,
          credentials: details.withCredentials ? "include" : "omit"
        };

        if (method !== "GET" && method !== "HEAD") {
          const body = reconstructBody(details.bodyDesc);
          if (body !== undefined) fetchOpts.body = body;
        }

        const resp = await fetch(details.url, fetchOpts);
        const rawHeaders = [];
        resp.headers.forEach((v, k) => rawHeaders.push(`${k}: ${v}`));
        const responseHeaders = rawHeaders.join("\r\n");

        const responseText = await resp.text();
        let responseJson = null;
        if (details.responseType === "json") {
          try { responseJson = JSON.parse(responseText); } catch { responseJson = null; }
        }

        sendResponse({
          ok: true,
          status: resp.status,
          statusText: resp.statusText || "",
          finalUrl: resp.url || details.url,
          responseHeaders,
          responseText,
          responseJson
        });
      } catch (err) {
        if (timedOut) {
          sendResponse({ ok: false, timeout: true, error: "Timeout" });
        } else if (err?.name === "AbortError") {
          sendResponse({ ok: false, aborted: true, error: "Aborted" });
        } else {
          sendResponse({ ok: false, error: err?.message || String(err) });
        }
      } finally {
        if (timer) clearTimeout(timer);
        activeRequests.delete(reqId);
      }
    })();

    return true;
  }

  return false;
});
