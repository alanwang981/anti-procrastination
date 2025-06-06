// variables
let lastUrl = null;
let lastSwitchTime = Date.now();
let focusMode = false;
let focusEndTime = 0;
let timer = null;

// domain matching utility
function matchesDomain(list, domain){
  if(!domain || !list) return false;
  return list.some(pattern => {
    if(pattern.startsWith('*.')){
      return domain === pattern.substring(2) || domain.endsWith('.' + pattern.substring(2));
    }
    return domain === pattern;
  });
}

// time tracking
function saveTime(domain){
  const now = Date.now(); // get time
  const elapsed = (now-lastSwitchTime)/1000; // convert to seconds
  lastSwitchTime = now;

  // report tracking
  chrome.storage.local.get(['tracking', 'whitelist', 'blacklist'], (res) => {
    const tracking = res.tracking || {};
    const today = new Date().toISOString().split('T')[0];
    // today's report tracking
    if(!tracking[today]) tracking[today] = { whitelist: 0, blacklist: 0 };
    
    const isWhite = matchesDomain(res.whitelist, domain);
    const isBlack = matchesDomain(res.blacklist, domain);

    if(isWhite) tracking[today].whitelist += elapsed;
    if(isBlack) tracking[today].blacklist += elapsed;
    // total report tracking
    tracking._total = tracking._total || { whitelist: 0, blacklist: 0 };
    if(isWhite) tracking._total.whitelist += elapsed;
    if(isBlack) tracking._total.blacklist += elapsed;

    chrome.storage.local.set({tracking});
  });
}

// tab monitoring
function monitorTab(tab){
  if(!tab.url) return;
  try{
    const domain = new URL(tab.url).hostname.replace('www.', '');
    if(lastUrl) saveTime(lastUrl);
    lastUrl = domain;
    // call on focus mode function
    if(focusMode) enforceFocusMode(domain, tab.id);
  } catch(e){
    console.error('Error processing URL:', e);
  }
}

// focus mode enforcement
function enforceFocusMode(domain, tabId) {
  chrome.storage.local.get(['whitelist', 'blacklist'], (res) => {
    const isBlacklisted = matchesDomain(res.blacklist, domain);
    const isWhitelisted = matchesDomain(res.whitelist, domain);
    // change blacklisted tab to warning
    if (isBlacklisted) {
      chrome.tabs.update(tabId, {url: chrome.runtime.getURL('warning.html')});
    } // give a warning for nonwhitelisted tabs
    else if(!isWhitelisted){
      chrome.scripting.executeScript({
        target: {tabId: tabId},
        func: () => alert("This site is productive! Please return to a produtive site.")
      });
    }
  });
}

// tab event listeners
chrome.tabs.onActivated.addListener(activeInfo => {
  chrome.tabs.get(activeInfo.tabId, monitorTab);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') monitorTab(tab);
});

// message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // error and success messages on popup
  switch (request.action) {
    case 'toggleFocus':
      focusMode = !focusMode;
      // check focus mode
      if (focusMode) {
        const duration = request.duration || 60;
        focusEndTime = Date.now() + duration * 60000;
        timer = setInterval(() => {
          // end focus mode
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

    // this is for reset tracking function in report
    if (request.action === "resetTracking") {
      lastUrl = null;
      lastSwitchTime = Date.now();
      sendResponse({ status: "success" });
    }
});