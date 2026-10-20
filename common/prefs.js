// User preferences shared by the popup and the options page, synced through chrome.storage.sync.
const LauncherPrefs = {
  DEFAULTS: { order: [], hidden: [], theme: 'auto' },

  async get() {
    const { prefs } = await chrome.storage.sync.get('prefs');
    return { ...this.DEFAULTS, ...prefs };
  },

  set(prefs) {
    return chrome.storage.sync.set({ prefs });
  },

  // Apps missing from the saved order, such as ones added by an update, keep their default order at the end.
  sortApps(apps, prefs) {
    const rank = (id) => {
      const index = prefs.order.indexOf(id);
      return index === -1 ? Infinity : index;
    };
    return [...apps].sort((a, b) => rank(a.id) - rank(b.id));
  },

  applyTheme(theme) {
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.dataset.theme = theme;
    } else {
      delete document.documentElement.dataset.theme;
    }
  }
};
