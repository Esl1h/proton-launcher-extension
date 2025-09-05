chrome.runtime.onInstalled.addListener((details) => {
  // Inicialização limpa
});

chrome.commands?.onCommand.addListener((command) => {
  if (command === 'open-launcher') {
    chrome.action.openPopup();
  }
});
