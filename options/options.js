class LauncherOptions {
  constructor() {
    this.apps = [];
    this.prefs = { ...LauncherPrefs.DEFAULTS };
    this.list = document.getElementById('appList');
    this.savedTimer = null;
  }

  async init() {
    this.localizePage();
    const response = await fetch(chrome.runtime.getURL('config/apps.json'));
    this.apps = (await response.json()).apps || [];
    this.prefs = await LauncherPrefs.get();
    LauncherPrefs.applyTheme(this.prefs.theme);
    this.renderApps();
    this.renderTheme();
    this.setupEventListeners();
  }

  t(key, ...substitutions) {
    return chrome.i18n.getMessage(key, substitutions.map(String)) || key;
  }

  localizePage() {
    document.documentElement.lang = chrome.i18n.getUILanguage();
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = this.t(el.dataset.i18n);
    });
  }

  renderApps() {
    const rows = LauncherPrefs.sortApps(this.apps, this.prefs).map(app => this.createRow(app));
    this.list.replaceChildren(...rows);
  }

  createRow(app) {
    const hidden = this.prefs.hidden.includes(app.id);
    const row = document.createElement('li');
    row.className = hidden ? 'app-row hidden-app' : 'app-row';
    row.draggable = true;
    row.dataset.id = app.id;

    const handle = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    handle.setAttribute('class', 'drag-handle');
    handle.setAttribute('viewBox', '0 0 16 16');
    handle.setAttribute('aria-hidden', 'true');
    for (const [cx, cy] of [[5, 3], [11, 3], [5, 8], [11, 8], [5, 13], [11, 13]]) {
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', cx);
      dot.setAttribute('cy', cy);
      dot.setAttribute('r', '1.5');
      dot.setAttribute('fill', 'currentColor');
      handle.append(dot);
    }

    const icon = document.createElement('img');
    icon.className = 'app-icon';
    icon.alt = '';
    icon.src = app.icon;
    // Without this the icon becomes its own drag source instead of the row.
    icon.draggable = false;

    const name = document.createElement('span');
    name.className = 'app-name';
    name.textContent = app.title;

    const toggle = document.createElement('label');
    toggle.className = 'show-toggle';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !hidden;
    checkbox.addEventListener('change', () => this.setHidden(app.id, !checkbox.checked));
    toggle.append(checkbox, this.t('showApp'));

    row.append(handle, icon, name, toggle);
    return row;
  }

  renderTheme() {
    const current = document.querySelector(`input[name="theme"][value="${this.prefs.theme}"]`);
    if (current) current.checked = true;
  }

  setupEventListeners() {
    this.list.addEventListener('dragstart', (e) => {
      const row = e.target.closest('.app-row');
      if (!row) return;
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', row.dataset.id);
    });

    // Rows move live while dragging; the resulting order is saved when the drag ends.
    this.list.addEventListener('dragover', (e) => {
      const dragging = this.list.querySelector('.dragging');
      if (!dragging) return;
      e.preventDefault();
      const row = e.target.closest('.app-row');
      if (!row || row === dragging) return;
      const { top, height } = row.getBoundingClientRect();
      const after = e.clientY > top + height / 2;
      this.list.insertBefore(dragging, after ? row.nextSibling : row);
    });

    this.list.addEventListener('drop', (e) => e.preventDefault());

    this.list.addEventListener('dragend', (e) => {
      const row = e.target.closest('.app-row');
      if (row) row.classList.remove('dragging');
      const order = [...this.list.children].map(li => li.dataset.id);
      if (order.join() !== LauncherPrefs.sortApps(this.apps, this.prefs).map(a => a.id).join()) {
        void this.save({ order });
      }
    });

    document.getElementById('themeOptions').addEventListener('change', (e) => {
      LauncherPrefs.applyTheme(e.target.value);
      void this.save({ theme: e.target.value });
    });

    document.getElementById('resetBtn').addEventListener('click', async () => {
      await this.save({ ...LauncherPrefs.DEFAULTS });
      LauncherPrefs.applyTheme(this.prefs.theme);
      this.renderApps();
      this.renderTheme();
    });
  }

  setHidden(id, hidden) {
    const others = this.prefs.hidden.filter(h => h !== id);
    void this.save({ hidden: hidden ? [...others, id] : others });
    this.list.querySelector(`[data-id="${id}"]`)?.classList.toggle('hidden-app', hidden);
  }

  async save(changes) {
    this.prefs = { ...this.prefs, ...changes };
    await LauncherPrefs.set(this.prefs);
    const note = document.getElementById('savedNote');
    note.textContent = this.t('saved');
    clearTimeout(this.savedTimer);
    this.savedTimer = setTimeout(() => { note.textContent = ''; }, 1500);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  void new LauncherOptions().init();
});
