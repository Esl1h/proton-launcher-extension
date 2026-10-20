class WebAppLauncher {
  constructor() {
    this.apps = [];
    this.settings = {};
    this.configCache = new Map();
    this.init();
  }

  async init() {
    const startTime = performance.now();
    try {
      this.updateStatusLine(1, 'loading configs...', 'warning');
      await this.loadConfigurations();
      this.renderGrid();
      this.setupEventListeners();
      this.applyTheme();
      this.updateStatus();
      const loadTime = performance.now() - startTime;
      this.updateStatusLine(1, `loaded on ${loadTime.toFixed(1)}ms`, 'success');
      const interval = this.settings.status?.update_interval || 30000;
      setInterval(() => this.updateStatus(), interval);
    } catch (error) {
      this.updateStatusLine(1, 'Error on load', 'error');
      this.updateStatusLine(2, '', 'error');
    }
  }

  async loadConfig(configFile) {
    if (this.configCache.has(configFile)) {
      return this.configCache.get(configFile);
    }

    const url = chrome.runtime.getURL(`config/${configFile}`);
    const response = await fetch(url);
    const config = await response.json();
    this.configCache.set(configFile, config);
    return config;
  }

  async loadConfigurations() {
    const [appsConfig, settingsConfig] = await Promise.all([
      this.loadConfig('apps.json'),
      this.loadConfig('settings.json')
    ]);

    this.apps = appsConfig.apps || [];
    this.settings = settingsConfig || {};
  }

  renderGrid() {
    const grid = document.getElementById('appGrid');
    if (!grid) return;

    grid.replaceChildren();
    const gridSize = this.getGridSize();
    const totalSlots = gridSize * gridSize;
    grid.style.setProperty('--grid-size', gridSize);

    for (let i = 0; i < totalSlots; i++) {
      const app = this.apps.find(app => app.position === i);
      const item = this.createAppItem(app, i);
      grid.appendChild(item);
    }
  }

  createAppItem(app, position) {
    const item = document.createElement('div');
    item.className = app ? 'app-item' : 'app-item empty';
    item.dataset.position = position;

    if (app) {
      const title = document.createElement('div');
      title.className = 'app-title';
      const icon = document.createElement('img');
      icon.className = 'app-icon';
      icon.alt = app.title;
      // Inline onerror handlers are blocked by the extension CSP.
      icon.addEventListener('error', () => {
        icon.src = this.getDefaultIcon();
      }, { once: true });
      icon.src = app.icon;
      title.textContent = app.title;
      item.append(icon, title);
      item.addEventListener('click', () => this.openApp(app));
    }

    return item;
  }

  getGridSize() {
    return this.settings.ui?.grid_size || 3;
  }

  async openApp(app) {
    if (!this.validateUrl(app.url)) {
      this.updateStatusLine(1, 'invalid URL', 'error');
      return;
    }
    try {
      await chrome.tabs.create({
        url: app.url,
        active: true
      });
      this.updateStatusLine(1, `Abrindo ${app.title}...`);
      if (this.settings.behavior?.close_popup_on_launch !== false) {
        window.close();
      }
    } catch (error) {
      this.updateStatusLine(2, '', 'error');
    }
  }

  setupEventListeners() {
    const reloadBtn = document.getElementById('reloadBtn');
    const statusLink = document.getElementById('statusLink');
    const appsLink = document.getElementById('appsLink');

    if (reloadBtn) {
      reloadBtn.addEventListener('click', () => this.reloadConfigurations());
    }
    if (statusLink) {
      statusLink.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: 'https://status.proton.me/' });
        window.close();
      });
    }
    if (appsLink) {
      appsLink.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: 'https://protonapps.com/' });
        window.close();
      });
    }
  }

  async reloadConfigurations() {
    this.updateStatusLine(1, 'loading...', 'warning');
    try {
      this.configCache.clear();
      await this.loadConfigurations();
      this.renderGrid();
      this.applyTheme();
      this.updateStatusLine(1, 'configs loaded!', 'success');
    } catch (error) {
      this.updateStatusLine(1, 'error on loading', 'error');
    }
  }

  applyTheme() {
    const theme = this.settings.themes?.[this.settings.ui?.theme || 'gradient'];
    if (theme?.background) {
      document.body.style.background = theme.background;
    }
  }

  getDefaultIcon() {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNiIgZmlsbD0iIzY2N2VlYSIvPgo8cmVjdCB4PSI4IiB5PSI4IiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHJ4PSIyIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K';
  }

  async updateStatus() {
    try {
      const online = navigator.onLine;
      const statusText = online ? 'Online' : 'Offline';
      const statusType = online ? 'success' : 'warning';
      this.updateStatusLine(1, `Status: ${statusText}`, statusType);
      const configuredApps = this.apps.length;
      const totalSlots = this.getGridSize() ** 2;
      this.updateStatusLine(2, `${configuredApps}/${totalSlots} apps sets`);
    } catch (error) {
      this.updateStatusLine(2, '', 'error');
    }
  }

  updateStatusLine(lineNumber, text, type = 'success') {
    const statusLine = document.getElementById(`statusLine${lineNumber}`);
    if (statusLine) {
      const indicator = document.createElement('span');
      indicator.className = `status-indicator ${type}`;
      statusLine.replaceChildren(indicator, text);
    }
  }

  validateUrl(url) {
    try {
      const urlObj = new URL(url);
      const allowedDomains = ['proton.me', 'protonvpn.com', 'simplelogin.io', 'standardnotes.com'];
      const host = urlObj.hostname;
      return urlObj.protocol === 'https:' &&
            allowedDomains.some(domain => host === domain || host.endsWith(`.${domain}`));
    } catch {
      return false;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new WebAppLauncher();
});
