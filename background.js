let lastUrl = null;
let lastSwitchTime = Date.now();
let focusMode = false;
let focusEndTime = 0;
let timer = null;

// Domain matching utility
function matchesDomain(list, domain) {
  if (!domain || !list) return false;
  return list.some(pattern => {
    if (pattern.startsWith('*.')) {
      return domain === pattern.substring(2) || domain.endsWith('.' + pattern.substring(2));
    }
    return domain === pattern;
  });
}

// Time tracking
function saveTime(domain) {
  const now = Date.now();
  const elapsed = (now - lastSwitchTime) / 1000; // seconds
  lastSwitchTime = now;

  chrome.storage.local.get(['tracking', 'whitelist', 'blacklist'], (res) => {
    const tracking = res.tracking || {};
    const today = new Date().toISOString().split('T')[0];
    
    if (!tracking[today]) tracking[today] = { whitelist: 0, blacklist: 0 };
    
    const isWhite = matchesDomain(res.whitelist, domain);
    const isBlack = matchesDomain(res.blacklist, domain);

    if (isWhite) tracking[today].whitelist += elapsed;
    if (isBlack) tracking[today].blacklist += elapsed;

    tracking._total = tracking._total || { whitelist: 0, blacklist: 0 };
    if (isWhite) tracking._total.whitelist += elapsed;
    if (isBlack) tracking._total.blacklist += elapsed;

    chrome.storage.local.set({ tracking });
  });
}

// Tab monitoring
function monitorTab(tab) {
  if (!tab.url) return;
  
  try {
    const domain = new URL(tab.url).hostname.replace('www.', '');
    if (lastUrl) saveTime(lastUrl);
    lastUrl = domain;
    
    if (focusMode) enforceFocusMode(domain, tab.id);
  } catch (e) {
    console.error('Error processing URL:', e);
  }
}

// Focus mode enforcement
function enforceFocusMode(domain, tabId) {
  chrome.storage.local.get(['whitelist', 'blacklist'], (res) => {
    const isBlacklisted = matchesDomain(res.blacklist, domain);
    const isWhitelisted = matchesDomain(res.whitelist, domain);
    
    if (isBlacklisted) {
      chrome.tabs.update(tabId, {url: chrome.runtime.getURL('warning.html')});
    } else if (!isWhitelisted) {
      chrome.scripting.executeScript({
        target: {tabId: tabId},
        func: () => alert("This site is not whitelisted! Please return to a whitelisted site.")
      });
    }
  });
}

// Tab event listeners
chrome.tabs.onActivated.addListener(activeInfo => {
  chrome.tabs.get(activeInfo.tabId, monitorTab);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') monitorTab(tab);
});

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'toggleFocus':
      focusMode = !focusMode;
      
      if (focusMode) {
        const duration = request.duration || 60;
        focusEndTime = Date.now() + duration * 60000;
        timer = setInterval(() => {
          if (Date.now() >= focusEndTime) {
            focusMode = false;
            clearInterval(timer);
            chrome.notifications.create({
              type: 'basic',
              iconUrl: 'icon.png',
              title: 'Focus Mode',
              message: 'Your focus session has ended!'
            });
          }
        }, 1000);
      } else if (timer) {
        clearInterval(timer);
      }
      sendResponse({ active: focusMode });
      break;

    case 'getFocusStatus':
      sendResponse({
        active: focusMode,
        remaining: focusMode ? focusEndTime - Date.now() : 0
      });
      break;

    case 'closeCurrentTab':
      chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        if (tabs[0]) chrome.tabs.remove(tabs[0].id);
      });
      break;

    case 'getWhitelist':
      chrome.storage.local.get(['whitelist'], res => {
        sendResponse({ whitelist: res.whitelist || [] });
      });
      return true;
  }
});