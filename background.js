let lastUrl = null;
let lastSwitchTime = Date.now();
let focusMode = false;
let focusEndTime = 0;
let timer = null;
let whitelistTimeTracker = {};
let proactiveMessageCooldown = false;

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

// Track productive time and trigger proactive messages
function trackProductiveTime(domain, elapsed) {
  chrome.storage.local.get(['whitelist'], (res) => {
    if (matchesDomain(res.whitelist, domain)) {
      const today = new Date().toISOString().split('T')[0];
      whitelistTimeTracker[today] = (whitelistTimeTracker[today] || 0) + elapsed;
      
      if (whitelistTimeTracker[today] >= 1200 && !proactiveMessageCooldown) {
        sendProactiveMessage('encouragement');
        whitelistTimeTracker[today] = 0;
        proactiveMessageCooldown = true;
        setTimeout(() => { proactiveMessageCooldown = false; }, 3600000);
      }
    } else if (!proactiveMessageCooldown) {
      sendProactiveMessage('reminder');
      proactiveMessageCooldown = true;
      setTimeout(() => { proactiveMessageCooldown = false; }, 1800000);
    }
  });
}

// Send proactive message to user
function sendProactiveMessage(type) {
  try {
    chrome.windows.create({
      url: chrome.runtime.getURL(`chatbot.html?proactive=${type}`),
      type: 'popup',
      width: 370,
      height: 550,
      left: Math.round(screen.availWidth / 2 - 185),
      top: Math.round(screen.availHeight / 2 - 275)
    });
  } catch (error) {
    console.error("Failed to open chatbot:", error);
    // Fallback notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'Productivity Reminder',
      message: type === 'reminder' 
        ? "You're on a non-whitelisted site!" 
        : "Great job staying focused!"
    });
  }
}

// Time tracking
function saveTime(domain) {
  const now = Date.now();
  const elapsed = (now - lastSwitchTime) / 1000;
  lastSwitchTime = now;

  trackProductiveTime(domain, elapsed);

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

    case 'openChatbot':
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]?.id) {
          chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            files: ['chatbot.js']
          }, () => {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'showChatbot'});
          });
        } else {
          chrome.tabs.create({url: chrome.runtime.getURL('chatbot.html')});
        }
      });
      sendResponse({success: true});
      break;
  }

  if (request.action === "resetTracking") {
    lastUrl = null;
    lastSwitchTime = Date.now();
    sendResponse({ status: "success" });
  }
});