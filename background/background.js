chrome.runtime.onInstalled.addListener((details) => {
  // Extensão instalada - configurações padrão são carregadas dinamicamente
});

chrome.commands?.onCommand.addListener((command) => {
  switch (command) {
    case 'open-launcher':
      chrome.action.openPopup();
      break;
  }
});
