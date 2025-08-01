class WebAppLauncher {
  constructor() {
    this.apps = [];
    this.settings = {};
    this.categories = {};
    this.configCache = new Map();
    this.init();
  }



  async init() {
    const startTime = performance.now();
    try {
      this.updateStatusLine(1, 'Carregando configurações...', 'warning');
      await this.loadConfigurations();
      this.renderGrid();
      this.setupEventListeners();
      this.applyTheme();
      this.updateStatus();
      const loadTime = performance.now() - startTime;
      this.updateStatusLine(1, `Carregado em ${loadTime.toFixed(1)}ms`, 'success');
      const interval = this.settings.status?.update_interval || 30000;
      setInterval(() => this.updateStatus(), interval);
    } catch (error) {
      this.updateStatusLine(1, 'Erro ao carregar', 'error');
      this.updateStatusLine(2, '', 'error');
      this.loadDefaultConfigurations();
      this.renderGrid();
      this.setupEventListeners();
    }
  }

  async loadConfig(configFile) {
    if (this.configCache.has(configFile)) {
      return this.configCache.get(configFile);
    }
    try {
      const url = chrome.runtime.getURL(`config/${configFile}`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error();
      }
      const config = await response.json();
      this.configCache.set(configFile, config);
      return config;
    } catch (error) {
      const defaultConfig = this.getDefaultConfig(configFile);
      return defaultConfig;
    }
  }

  async loadConfigurations() {
    try {
      const [appsConfig, settingsConfig] = await Promise.all([
        this.loadConfig('apps.json'),
        this.loadConfig('settings.json')
      ]);
      this.apps = appsConfig?.apps || [];
      this.categories = appsConfig?.categories || {};
      this.settings = settingsConfig || {};
      const userApps = await this.loadUserConfig();
      if (userApps && userApps.length > 0) {
        this.mergeUserApps(userApps);
      }
    } catch (error) {
      throw error;
    }
  }

  loadDefaultConfigurations() {
    this.apps = [
      {
        title: 'url',
        url: 'https://url.com',
        icon: 'https://url.com/ui.ico',
        position: 0,
        category: 'productivity'
      },
      {
        title: 'url2',
        url: 'https://url2.com',
        icon: 'https://url2.com/favicon_v2014_2.ico',
        position: 1,
        category: 'storage'
      }
    ];
    this.categories = {
      productivity: {
        name: 'Produtividade',
        color: '#667eea',
        icon: '📊'
      },
      storage: {
        name: 'Armazenamento',
        color: '#48bb78',
        icon: '💾'
      }
    };
    this.settings = {
      ui: {
        theme: 'gradient',
        grid_size: 3,
        show_categories: true
      },
      behavior: {
        open_as_webapp: true,
        close_popup_on_launch: true
      },
      status: {
        show_status: true,
        update_interval: 30000
      },
      themes: {
        gradient: {
          primary: '#667eea',
          secondary: '#764ba2',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }
      }
    };
  }

  getDefaultConfig(configFile) {
    if (configFile === 'apps.json') {
      return {
        apps: [
          {
            title: 'title',
            url: 'https://url.com',
            icon: 'https://url.com/ui.ico',
            position: 0,
            category: 'productivity'
          },
          {
            title: 'title2',
            url: 'https://url2.com',
            icon: 'https://url2.com/images/favicon_v2014_2.ico',
            position: 1,
            category: 'storage'
          }
        ],
        categories: {
          productivity: {
            name: 'Produtividade',
            color: '#667eea',
            icon: '📊'
          },
          storage: {
            name: 'Armazenamento',
            color: '#48bb78',
            icon: '💾'
          }
        }
      };
    }
    if (configFile === 'settings.json') {
      return {
        ui: {
          theme: 'gradient',
          grid_size: 3,
          show_categories: true
        },
        behavior: {
          open_as_webapp: true,
          close_popup_on_launch: true
        },
        status: {
          show_status: true,
          update_interval: 30000
        },
        themes: {
          gradient: {
            primary: '#667eea',
            secondary: '#764ba2',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          }
        }
      };
    }
    return {};
  }

  async loadUserConfig() {
    try {
      const result = await chrome.storage.sync.get(['userApps', 'lastUpdated']);
      return result.userApps || null;
    } catch (error) {
      return null;
    }
  }

  mergeUserApps(userApps) {
    userApps.forEach(userApp => {
      const existingIndex = this.apps.findIndex(
        app => app.position === userApp.position
      );
      if (existingIndex >= 0) {
        this.apps[existingIndex] = { ...this.apps[existingIndex], ...userApp };
      } else {
        this.apps.push(userApp);
      }
    });
  }

  renderGrid() {
    const grid = document.getElementById('appGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const gridSize = this.settings.ui?.grid_size || 3;
    const totalSlots = gridSize * gridSize;
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
      const category = this.categories[app.category];
      const categoryColor = category?.color || '#667eea';
      item.innerHTML = `
        <img class="app-icon" src="${app.icon}" alt="${app.title}" 
             onerror="this.src='${this.getDefaultIcon()}'">
        <div class="app-title">${app.title}</div>
        ${this.settings.ui?.show_categories && category ? 
          `<div class="app-category" style="color: ${categoryColor}">
            ${category.icon || ''} ${category.name}
           </div>` : ''}
      `;
      item.addEventListener('click', () => this.openApp(app));
    } else {
      item.innerHTML = '<div class="app-title">+</div>';
      item.addEventListener('click', () => this.openSettings(position));
    }
    return item;
  }

  async openApp(app) {
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
    const settingsBtn = document.getElementById('settingsBtn');
    const reloadBtn = document.getElementById('reloadBtn');
    const statusLink = document.getElementById('statusLink');
    const appsLink = document.getElementById('appsLink');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.openSettings());
    }
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
    this.updateStatusLine(1, 'Recarregando...', 'warning');
    try {
      this.configCache.clear();
      await this.loadConfigurations();
      this.renderGrid();
      this.applyTheme();
      this.updateStatusLine(1, 'Configurações recarregadas!', 'success');
    } catch (error) {
      this.updateStatusLine(1, 'Erro ao recarregar', 'error');
    }
  }

  applyTheme() {
    const theme = this.settings.themes?.[this.settings.ui?.theme || 'gradient'];
    if (theme) {
      document.documentElement.style.setProperty('--primary-color', theme.primary);
      document.documentElement.style.setProperty('--secondary-color', theme.secondary);
      if (theme.background) {
        document.body.style.background = theme.background;
      }
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
      this.updateStatusLine(2, `${configuredApps}/9 apps configurados`);
    } catch (error) {
      this.updateStatusLine(2, '', 'error');
    }
  }

  updateStatusLine(lineNumber, text, type = 'success') {
    const statusLine = document.getElementById(`statusLine${lineNumber}`);
    if (statusLine) {
      statusLine.innerHTML = `
        <span class="status-indicator ${type}"></span>
        ${text}
      `;
    }
  }

  openSettings() {
    alert('Configurações em desenvolvimento!');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new WebAppLauncher();
});