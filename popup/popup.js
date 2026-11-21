/**
 * Semantic Shield - Popup Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const shieldToggle = document.getElementById('shield-toggle');
  const statusText = document.getElementById('status-text');
  const blockedCount = document.getElementById('blocked-count');
  const genaiToggle = document.getElementById('genai-toggle');
  const sludgeToggle = document.getElementById('sludge-toggle');
  const ipiToggle = document.getElementById('ipi-toggle');
  const btnPicker = document.getElementById('btn-picker');
  const btnSidepanel = document.getElementById('btn-sidepanel');
  const btnFeedback = document.getElementById('btn-feedback');

  // Load Initial State
  const data = await chrome.storage.local.get([
    'shieldActive',
    'blockedCount',
    'blockGenAI',
    'collapseSludge',
    'scanIPI',
  ]);

  const isActive = data.shieldActive !== false;
  shieldToggle.checked = isActive;
  updateStatusDisplay(isActive);

  blockedCount.textContent = (data.blockedCount || 0).toLocaleString();
  genaiToggle.checked = data.blockGenAI !== false;
  sludgeToggle.checked = data.collapseSludge !== false;
  if (ipiToggle) ipiToggle.checked = data.scanIPI !== false;

  // Toggle Handlers
  shieldToggle.addEventListener('change', async () => {
    const active = shieldToggle.checked;
    await chrome.storage.local.set({ shieldActive: active });
    updateStatusDisplay(active);
  });

  genaiToggle.addEventListener('change', async () => {
    await chrome.storage.local.set({ blockGenAI: genaiToggle.checked });
  });

  sludgeToggle.addEventListener('change', async () => {
    await chrome.storage.local.set({ collapseSludge: sludgeToggle.checked });
  });

  if (ipiToggle) {
    ipiToggle.addEventListener('change', async () => {
      await chrome.storage.local.set({ scanIPI: ipiToggle.checked });
    });
  }

  function updateStatusDisplay(active) {
    statusText.textContent = active ? 'Shield Active' : 'Shield Disabled';
    statusText.className = `status-indicator ${active ? '' : 'disabled'}`;
  }

  // Element Picker Trigger
  btnPicker.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, { action: 'launchElementPicker' }).catch(() => {});
      window.close();
    }
  });

  // Open Power Dashboard in Side Panel
  btnSidepanel.addEventListener('click', async () => {
    const currentWindow = await chrome.windows.getCurrent();
    await chrome.runtime.sendMessage({
      action: 'openSidePanel',
      windowId: currentWindow.id,
    });
    window.close();
  });

  // Open Help & Feedback Tab in Side Panel
  if (btnFeedback) {
    btnFeedback.addEventListener('click', async () => {
      const currentWindow = await chrome.windows.getCurrent();
      await chrome.runtime.sendMessage({
        action: 'openSidePanel',
        windowId: currentWindow.id,
        targetTab: 'tab-feedback',
      });
      window.close();
    });
  }
});
