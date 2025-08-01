const StorageManager = {
  async saveApps(apps) {
    try {
      await chrome.storage.sync.set({ webapps: apps });
      return true;
    } catch (error) {
      console.error('Erro ao salvar apps:', error);
      return false;
    }
  },

  async loadApps() {
    try {
      const result = await chrome.storage.sync.get(['webapps']);
      return result.webapps || [];
    } catch (error) {
      console.error('Erro ao carregar apps:', error);
      return [];
    }
  },

  async saveSettings(settings) {
    try {
      await chrome.storage.sync.set({ settings });
      return true;
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      return false;
    }
  },

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['settings']);
      return result.settings || {
        openAsWebApp: true,
        showStatus: true,
        theme: 'default'
      };
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      return {};
    }
  }
};

window.StorageManager = StorageManager;
