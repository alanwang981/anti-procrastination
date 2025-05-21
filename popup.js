// DOM elements
const statusEl = document.getElementById('status');

// Show status message
function showStatus(message, type = '') {
  statusEl.textContent = message;
  statusEl.className = type;
  if (type) setTimeout(() => statusEl.className = '', 3000);
}

// Load and display lists
function loadLists() {
  chrome.storage.local.get(['whitelist', 'blacklist'], res => {
    const renderList = (list, elementId) => {
      const el = document.getElementById(elementId);
      el.innerHTML = list?.length 
        ? list.map(domain => `
            <li>
              <span>${domain}</span>
              <button data-type="${elementId.replace('Display', '')}" 
                      data-domain="${domain}">
                Remove
              </button>
            </li>
          `).join('')
        : '<li>No sites added yet</li>';
    };

    renderList(res.whitelist, 'whitelistDisplay');
    renderList(res.blacklist, 'blacklistDisplay');
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.website-list button').forEach(btn => {
      btn.addEventListener('click', () => {
        removeFromList(btn.dataset.type, btn.dataset.domain);
      });
    });
  });
}

// Validate domain format
function isValidDomain(domain) {
  return /^(\*\.)?([a-z0-9-]+\.)+[a-z]{2,}$/i.test(domain);
}

// Add domain to list
function addToList(type) {
  const input = document.getElementById(`${type}Input`).value.trim();
  if (!isValidDomain(input)) {
    showStatus('Invalid domain format (use example.com or *.example.com)', 'error');
    return;
  }

  chrome.storage.local.get([type], res => {
    const list = res[type] || [];
    if (list.includes(input)) {
      showStatus(`"${input}" already in ${type}`, 'error');
      return;
    }

    list.push(input);
    chrome.storage.local.set({ [type]: list }, () => {
      if (chrome.runtime.lastError) {
        showStatus('Failed to save, try again', 'error');
      } else {
        showStatus(`Added "${input}" to ${type}`, 'success');
        document.getElementById(`${type}Input`).value = '';
        loadLists();
      }
    });
  });
}

// Remove domain from list
function removeFromList(type, domain) {
  chrome.storage.local.get([type], res => {
    const list = (res[type] || []).filter(d => d !== domain);
    chrome.storage.local.set({ [type]: list }, () => {
      if (chrome.runtime.lastError) {
        showStatus('Failed to remove, try again', 'error');
      } else {
        showStatus(`Removed "${domain}" from ${type}`, 'success');
        loadLists();
      }
    });
  });
}

// Update focus mode status display
function updateFocusStatus() {
  chrome.runtime.sendMessage({action: 'getFocusStatus'}, response => {
    if (response.active) {
      const mins = Math.floor(response.remaining / 60000);
      const secs = Math.floor((response.remaining % 60000) / 1000);
      statusEl.textContent = `Focus Mode: ${mins}m ${secs}s remaining`;
      statusEl.className = 'success';
    } else {
      statusEl.textContent = 'Focus Mode: Inactive';
      statusEl.className = '';
    }
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Help button
  document.getElementById('helpBtn').addEventListener('click', () => {
    chrome.tabs.create({url: chrome.runtime.getURL('help.html')});
  });

  // Load initial data
  loadLists();
  updateFocusStatus();
  setInterval(updateFocusStatus, 1000);
  
  // Event listeners
  document.getElementById('toggleFocus').addEventListener('click', () => {
    const duration = parseInt(document.getElementById('focusDuration').value) || 60;
    chrome.runtime.sendMessage({action: 'toggleFocus', duration}, updateFocusStatus);
  });
  
  document.getElementById('addWhitelist').addEventListener('click', () => addToList('whitelist'));
  document.getElementById('addBlacklist').addEventListener('click', () => addToList('blacklist'));
  document.getElementById('showReport').addEventListener('click', () => {
    chrome.tabs.create({url: chrome.runtime.getURL('report.html')});
  });
  document.getElementById('refresh').addEventListener('click', () => {
    loadLists();
    updateFocusStatus();
  });
});
