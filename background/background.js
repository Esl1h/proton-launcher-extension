chrome.runtime.onInstalled.addListener((details) => {
  // Inicialização limpa
});

chrome.commands?.onCommand.addListener((command) => {
  if (command === 'open-launcher') {
    chrome.action.openPopup();
  }
});

// Adicionar cache para recursos estáticos
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('config/')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
