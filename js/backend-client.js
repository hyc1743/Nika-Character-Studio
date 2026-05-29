(function () {
  const state = {
    checked: false,
    authenticated: false
  };

  async function apiFetch(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      try {
        const data = await response.json();
        message = data.error || message;
      } catch {
        // Keep default message.
      }
      throw new Error(message);
    }
    const type = response.headers.get('content-type') || '';
    return type.includes('application/json') ? response.json() : response.text();
  }

  function shouldProxyFetch(input) {
    try {
      const url = new URL(input instanceof Request ? input.url : String(input), window.location.href);
      if (url.origin === window.location.origin) return false;
      if (window.NIKA_DISABLE_FETCH_PROXY === true) return false;
      if (url.pathname.includes('/sdapi/v1/')) return true;
      if (url.pathname.includes('/chat/completions')) return true;
      if (url.pathname.includes('/generateContent')) return true;
      if (url.pathname.endsWith('/models') || url.pathname.includes('/v1beta/models')) return true;
      return /(^|\.)((openai|deepseek|googleapis|siliconflow|anthropic|mistral|openrouter)\.(com|cn|ai)|together\.xyz)$/i.test(url.hostname);
    } catch {
      return false;
    }
  }

  async function serializeFetchBody(input, init) {
    if (init && init.body != null) return init.body;
    if (input instanceof Request) return input.clone().text();
    return undefined;
  }

  function installFetchProxy() {
    if (window.__nikaFetchProxyInstalled) return;
    window.__nikaFetchProxyInstalled = true;
    const originalFetch = window.fetch.bind(window);
    window.fetch = async function nikaFetch(input, init = {}) {
      if (!shouldProxyFetch(input)) return originalFetch(input, init);

      const sourceRequest = input instanceof Request ? input : null;
      const headers = {};
      const sourceHeaders = new Headers(init.headers || sourceRequest?.headers || {});
      sourceHeaders.forEach((value, key) => {
        headers[key] = value;
      });

      return originalFetch('/api/ai/proxy', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: sourceRequest ? sourceRequest.url : String(input),
          method: init.method || sourceRequest?.method || 'GET',
          headers,
          body: await serializeFetchBody(input, init)
        })
      });
    };
  }

  async function checkSession() {
    try {
      const data = await apiFetch('/api/auth/session', { method: 'GET' });
      state.checked = true;
      state.authenticated = Boolean(data.authenticated);
      return state.authenticated;
    } catch {
      state.checked = true;
      state.authenticated = false;
      return false;
    }
  }

  async function login(password) {
    await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password })
    });
    state.authenticated = true;
  }

  async function logout() {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    state.authenticated = false;
    window.location.reload();
  }

  function ensureLoginStyles() {
    if (document.getElementById('nika-backend-login-style')) return;
    const style = document.createElement('style');
    style.id = 'nika-backend-login-style';
    style.textContent = `
      #nika-backend-login {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: grid;
        place-items: center;
        background: #111827;
        color: #f9fafb;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      #nika-backend-login form {
        width: min(360px, calc(100vw - 32px));
        display: grid;
        gap: 12px;
        padding: 24px;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 8px;
        background: #1f2937;
      }
      #nika-backend-login h1 { font-size: 20px; margin: 0 0 4px; }
      #nika-backend-login input {
        width: 100%;
        box-sizing: border-box;
        padding: 10px 12px;
        border-radius: 6px;
        border: 1px solid rgba(255,255,255,.2);
        background: #111827;
        color: #fff;
      }
      #nika-backend-login button {
        padding: 10px 12px;
        border: 0;
        border-radius: 6px;
        background: #f97316;
        color: #fff;
        font-weight: 700;
        cursor: pointer;
      }
      #nika-backend-login .error { min-height: 18px; color: #fca5a5; font-size: 13px; }
    `;
    document.head.appendChild(style);
  }

  function showLoginGate() {
    if (document.getElementById('nika-backend-login')) return;
    ensureLoginStyles();
    const root = document.createElement('div');
    root.id = 'nika-backend-login';
    root.innerHTML = `
      <form>
        <h1>Nika Character Studio</h1>
        <input type="password" autocomplete="current-password" placeholder="站点密码" required>
        <button type="submit">登录</button>
        <div class="error" aria-live="polite"></div>
      </form>
    `;
    root.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault();
      const input = root.querySelector('input');
      const error = root.querySelector('.error');
      error.textContent = '';
      try {
        await login(input.value);
        root.remove();
        showSyncWidget();
      } catch (e) {
        error.textContent = e.message || '登录失败';
      }
    });
    document.body.appendChild(root);
  }

  function openDb(name, version) {
    return new Promise((resolve, reject) => {
      const request = version ? indexedDB.open(name, version) : indexedDB.open(name);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error(`IndexedDB blocked: ${name}`));
    });
  }

  function txDone(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
    });
  }

  async function dumpIndexedDb() {
    if (!indexedDB.databases) return {};
    const dbs = await indexedDB.databases();
    const snapshot = {};
    for (const info of dbs) {
      if (!info.name) continue;
      const db = await openDb(info.name, info.version);
      const stores = {};
      for (const storeName of Array.from(db.objectStoreNames)) {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        stores[storeName] = await new Promise((resolve, reject) => {
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        });
      }
      snapshot[info.name] = { version: info.version, stores };
      db.close();
    }
    return snapshot;
  }

  async function restoreIndexedDb(snapshot) {
    for (const [dbName, dbData] of Object.entries(snapshot || {})) {
      const db = await openDb(dbName, dbData.version);
      for (const [storeName, records] of Object.entries(dbData.stores || {})) {
        if (!db.objectStoreNames.contains(storeName)) continue;
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.clear();
        for (const record of records || []) store.put(record);
        await txDone(tx);
      }
      db.close();
    }
  }

  function dumpLocalStorage() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      data[key] = localStorage.getItem(key);
    }
    return data;
  }

  function restoreLocalStorage(data) {
    Object.entries(data || {}).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
  }

  async function backupBrowserState() {
    const snapshot = {
      createdAt: new Date().toISOString(),
      localStorage: dumpLocalStorage(),
      indexedDB: await dumpIndexedDb()
    };
    await remoteStorage.setItem('browser_state_snapshot_v1', JSON.stringify(snapshot));
    return snapshot;
  }

  async function restoreBrowserState() {
    const raw = await remoteStorage.getItem('browser_state_snapshot_v1');
    if (!raw) throw new Error('No server snapshot found');
    const snapshot = JSON.parse(raw);
    restoreLocalStorage(snapshot.localStorage);
    await restoreIndexedDb(snapshot.indexedDB);
    return snapshot;
  }

  function ensureSyncWidgetStyles() {
    if (document.getElementById('nika-backend-sync-style')) return;
    const style = document.createElement('style');
    style.id = 'nika-backend-sync-style';
    style.textContent = `
      #nika-backend-sync {
        position: fixed;
        right: 12px;
        bottom: 12px;
        z-index: 2147483000;
        display: flex;
        gap: 6px;
        padding: 6px;
        border: 1px solid rgba(0,0,0,.12);
        border-radius: 8px;
        background: rgba(17, 24, 39, .92);
        box-shadow: 0 8px 24px rgba(0,0,0,.18);
      }
      #nika-backend-sync button {
        border: 0;
        border-radius: 6px;
        padding: 6px 8px;
        background: #374151;
        color: #fff;
        font-size: 12px;
        cursor: pointer;
      }
      #nika-backend-sync button:hover { background: #4b5563; }
    `;
    document.head.appendChild(style);
  }

  function showSyncWidget() {
    if (document.getElementById('nika-backend-sync')) return;
    ensureSyncWidgetStyles();
    const root = document.createElement('div');
    root.id = 'nika-backend-sync';
    root.innerHTML = `
      <button type="button" data-action="backup" title="备份本地数据到后端">备份</button>
      <button type="button" data-action="restore" title="从后端恢复到本地浏览器">恢复</button>
      <button type="button" data-action="logout" title="退出登录">退出</button>
    `;
    root.addEventListener('click', async event => {
      const action = event.target?.dataset?.action;
      if (!action) return;
      try {
        if (action === 'backup') {
          await backupBrowserState();
          alert('备份完成');
        } else if (action === 'restore') {
          if (!confirm('将使用后端快照覆盖当前浏览器本地数据，是否继续？')) return;
          await restoreBrowserState();
          alert('恢复完成，页面将刷新');
          window.location.reload();
        } else if (action === 'logout') {
          await logout();
        }
      } catch (error) {
        alert(error.message || '操作失败');
      }
    });
    document.body.appendChild(root);
  }

  const remoteStorage = {
    async getItem(key) {
      const data = await apiFetch(`/api/storage/kv?key=${encodeURIComponent(key)}`);
      return data.value == null ? null : JSON.stringify(data.value);
    },
    async setItem(key, value) {
      let parsed = value;
      try {
        parsed = JSON.parse(value);
      } catch {
        // Store as a string when it is not JSON.
      }
      await apiFetch('/api/storage/kv', {
        method: 'PUT',
        body: JSON.stringify({ key, value: parsed })
      });
    },
    async removeItem(key) {
      await apiFetch('/api/storage/kv', {
        method: 'DELETE',
        body: JSON.stringify({ key })
      });
    }
  };

  async function aiChat(payload) {
    return apiFetch('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async function createJob(type, payload) {
    const data = await apiFetch('/api/jobs', {
      method: 'POST',
      body: JSON.stringify({ type, payload })
    });
    return data.job;
  }

  async function getJob(id) {
    return apiFetch(`/api/jobs/${encodeURIComponent(id)}`);
  }

  async function createArtifact(input) {
    const data = await apiFetch('/api/artifacts', {
      method: 'POST',
      body: JSON.stringify(input)
    });
    return data.artifact;
  }

  async function listArtifacts(limit = 100) {
    const data = await apiFetch(`/api/artifacts?limit=${encodeURIComponent(limit)}`);
    return data.artifacts || [];
  }

  window.NikaBackend = {
    state,
    apiFetch,
    checkSession,
    login,
    logout,
    remoteStorage,
    aiChat,
    createJob,
    getJob,
    createArtifact,
    listArtifacts,
    backupBrowserState,
    restoreBrowserState,
    installFetchProxy
  };

  installFetchProxy();

  document.addEventListener('DOMContentLoaded', async () => {
    const authenticated = await checkSession();
    if (!authenticated) showLoginGate();
    else showSyncWidget();
  });
})();
