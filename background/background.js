chrome.runtime.onInstalled.addListener((details) => {
//   if (details.reason === 'install') {
//     initializeDefaultSettings();
//   }
// });

// async function initializeDefaultSettings() {
//   try {
//     const result = await chrome.storage.sync.get(['userApps', 'userSettings']);
//     // Se não há configurações do usuário, não faz nada
//   } catch (error) {}
// }
});

chrome.commands?.onCommand.addListener((command) => {
  switch (command) {
    case 'open-launcher':
      chrome.action.openPopup();
      break;
  }
});
