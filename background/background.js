chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    initializeDefaultSettings();
  }
});

async function initializeDefaultSettings() {
  try {
    const result = await chrome.storage.sync.get(['userApps', 'userSettings']);
    // Se não há configurações do usuário, não faz nada
  } catch (error) {}
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'WEBAPP_DETECTED':
      // Sugestão ou estatística não implementada
      break;
    case 'GET_ACTIVE_TAB':
      getActiveTabInfo(sendResponse);
      return true;
    case 'OPEN_APP':
      openApp(message.url, sendResponse);
      return true;
  }
});

async function getActiveTabInfo(sendResponse) {
  try {
    const [activeTab] = await chrome.tabs.query({ 
      active: true, 
      currentWindow: true 
    });
    sendResponse({
      success: true,
      tab: {
        id: activeTab.id,
        url: activeTab.url,
        title: activeTab.title,
        favIconUrl: activeTab.favIconUrl
      }
    });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function openApp(url, sendResponse) {
  try {
    const tab = await chrome.tabs.create({
      url: url,
      active: true
    });
    sendResponse({ 
      success: true, 
      tabId: tab.id 
    });
  } catch (error) {
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

chrome.tabs.onActivated.addListener((activeInfo) => {
  // Tracking de uso não implementado
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    checkIfWebApp(tab);
  }
});

function checkIfWebApp(tab) {
  const knownWebApps = [
    'mail.google.com',
    'calendar.google.com',
    'drive.google.com',
    'docs.google.com',
    'sheets.google.com',
    'slides.google.com',
    'notion.so',
    'figma.com',
    'slack.com',
    'discord.com',
    'github.com',
    'gitlab.com'
  ];
  try {
    const hostname = new URL(tab.url).hostname;
    const isWebApp = knownWebApps.some(webapp => hostname.includes(webapp));
    if (isWebApp) {
      // Notificação/sugestão não implementada
    }
  } catch (error) {}
}

chrome.commands?.onCommand.addListener((command) => {
  switch (command) {
    case 'open-launcher':
      chrome.action.openPopup();
      break;
  }
});

chrome.action.onClicked.addListener((tab) => {
  // Só dispara se não houver popup definido
});