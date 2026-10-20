class WebAppLauncher {
  constructor() {
    this.apps = [];
    this.settings = {};
    this.configCache = new Map();
    this.init();
  }

  async init() {
    const startTime = performance.now();
    this.localizePage();
    try {
      this.updateStatusLine(1, this.t('loadingConfigs'), 'warning');
      await this.loadConfigurations();
      this.renderGrid();
      this.setupEventListeners();
      this.applyTheme();
      this.updateStatus();
      const loadTime = performance.now() - startTime;
      this.updateStatusLine(1, this.t('loadedIn', loadTime.toFixed(1)), 'success');
      window.addEventListener('online', () => this.updateStatus());
      window.addEventListener('offline', () => this.updateStatus());
    } catch (error) {
      this.updateStatusLine(1, this.t('loadError'), 'error');
      this.updateStatusLine(2, '', 'error');
    }
  }

  t(key, ...substitutions) {
    return chrome.i18n.getMessage(key, substitutions.map(String)) || key;
  }

  localizePage() {
    document.documentElement.lang = chrome.i18n.getUILanguage();
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = this.t(el.dataset.i18n);
    });
    // Icon-only buttons need the label for screen readers too.
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = this.t(el.dataset.i18nTitle);
      el.setAttribute('aria-label', el.title);
    });
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
      this.updateStatusLine(1, this.t('invalidUrl'), 'error');
      return;
    }
    try {
      await chrome.tabs.create({
        url: app.url,
        active: true
      });
      this.updateStatusLine(1, this.t('opening', app.title));
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
      statusLink.addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://status.proton.me/' });
        window.close();
      });
    }
    if (appsLink) {
      appsLink.addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://protonapps.com/' });
        window.close();
      });
    }
  }

  async reloadConfigurations() {
    this.updateStatusLine(1, this.t('reloading'), 'warning');
    try {
      this.configCache.clear();
      await this.loadConfigurations();
      this.renderGrid();
      this.applyTheme();
      this.updateStatusLine(1, this.t('reloaded'), 'success');
    } catch (error) {
      this.updateStatusLine(1, this.t('loadError'), 'error');
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

  updateStatus() {
    // navigator.onLine only reflects local network state, not Proton service health.
    const online = navigator.onLine;
    const statusText = this.t(online ? 'online' : 'offline');
    const statusType = online ? 'success' : 'warning';
    const configuredApps = this.apps.length;
    const totalSlots = this.getGridSize() ** 2;
    this.updateStatusLine(2, this.t('appsStatus', statusText, configuredApps, totalSlots), statusType);
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
