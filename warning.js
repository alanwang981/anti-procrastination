document.getElementById('closeTab').addEventListener('click', () => {
    chrome.runtime.sendMessage({action: 'closeCurrentTab'});
  });
  
  document.getElementById('goToWhitelist').addEventListener('click', () => {
    chrome.runtime.sendMessage({action: 'getWhitelist'}, response => {
      if (response.whitelist?.length) {
        const domain = response.whitelist[0].replace('*.', '');
        chrome.tabs.update({url: `https://${domain}`});
      } else {
        chrome.runtime.sendMessage({action: 'closeCurrentTab'});
      }
    });
  });