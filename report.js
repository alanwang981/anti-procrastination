// Time Formatting function
function formatTime(seconds) {
  if (seconds < 1) return "0s";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return [hours > 0 ? `${hours}h` : '', minutes > 0 ? `${minutes}m` : '', `${secs}s`]
    .filter(Boolean).join(' ');
}

// Generate Report function
function generateReport() {
  const reportEl = document.getElementById('report');
  reportEl.innerHTML = '<p class="no-data">Generating report...</p>';
  
  chrome.storage.local.get(['tracking', 'whitelist', 'blacklist'], res => {
    const range = document.getElementById('range').value;
    let whitelistTime = 0;
    let blacklistTime = 0;
    const now = new Date();

    if (range === 'total') {
      whitelistTime = res.tracking?._total?.whitelist || 0;
      blacklistTime = res.tracking?._total?.blacklist || 0;
    } else {
      const days = range === 'daily' ? 1 : range === 'weekly' ? 7 : 30;
      for (let i = 0; i < days; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        if (res.tracking?.[dateKey]) {
          whitelistTime += res.tracking[dateKey].whitelist || 0;
          blacklistTime += res.tracking[dateKey].blacklist || 0;
        }
      }
    }
    
    const totalTime = whitelistTime + blacklistTime;

    // error message for edgecase
    if (totalTime < 0.1) {
      reportEl.innerHTML = `
        <p class="no-data">No significant data for this period</p>
        ${!res.whitelist?.length ? '<p class="negative">No whitelisted sites configured</p>' : ''}
      `;
      return;
    }

    const ratio = totalTime > 0 ? (whitelistTime / totalTime * 100) : 0;
    
    reportEl.innerHTML = `
      <div class="time-entry positive">Whitelisted: ${formatTime(whitelistTime)}</div>
      <div class="time-entry negative">Blacklisted: ${formatTime(blacklistTime)}</div>
      <div class="time-entry">Total Tracked: ${formatTime(totalTime)}</div>
      <div class="ratio-display">
        Productivity Ratio: ${ratio.toFixed(1)}%
        <progress value="${ratio}" max="100"></progress>
      </div>
      <p class="timestamp">Generated at ${new Date().toLocaleTimeString()}</p>
    `;
  });
}

// Reset Statistics Function
function setupResetButton() {
  const resetBtn = document.getElementById('resetStats');
  const confirmDialog = document.getElementById('confirmReset');
  const confirmBtn = document.getElementById('confirmResetBtn');
  const cancelBtn = document.getElementById('cancelResetBtn');

  resetBtn.addEventListener('click', () => {
    confirmDialog.style.display = 'block';
  });

  cancelBtn.addEventListener('click', () => {
    confirmDialog.style.display = 'none';
  });

  confirmBtn.addEventListener('click', () => {
    chrome.storage.local.set({ tracking: {} }, () => {
      confirmDialog.style.display = 'none';
      generateReport(); // Refresh the report
      // Notify background.js to reset active tracking
      chrome.runtime.sendMessage({ action: "resetTracking" });
    });
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('generate').addEventListener('click', generateReport);
  document.getElementById('refresh').addEventListener('click', generateReport);
  setupResetButton();
  generateReport();
});
