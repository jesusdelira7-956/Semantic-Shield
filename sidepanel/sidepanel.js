/**
 * Semantic Shield - Side Panel Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Tabs Navigation
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach((b) => b.classList.remove('active'));
      tabContents.forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add('active');
    });
  });

  // -------------------------------------------------------------
  // 1. My Filters Editor
  // -------------------------------------------------------------
  const textarea = document.getElementById('filter-textarea');
  const btnCompile = document.getElementById('btn-compile');
  const compileStatus = document.getElementById('compile-status');

  const { userFilters = '', dynamicRuleCount = 0 } = await chrome.storage.local.get([
    'userFilters',
    'dynamicRuleCount',
  ]);
  textarea.value = userFilters;
  compileStatus.textContent = `Ready. ${dynamicRuleCount} dynamic rules active in declarativeNetRequest.`;

  btnCompile.addEventListener('click', async () => {
    compileStatus.textContent = 'Compiling filters into MV3 dynamic rules...';
    const filterText = textarea.value;
    await chrome.storage.local.set({ userFilters: filterText });

    chrome.runtime.sendMessage({ action: 'recompileFilters', filterText }, (res) => {
      if (res?.success) {
        compileStatus.textContent = `Compiled successfully! ${res.dynamicCount} dynamic network rules + ${res.cosmeticCount} cosmetic rules active.`;
        compileStatus.style.color = '#10b981';
      } else {
        compileStatus.textContent = `Compilation error: ${res?.error || 'Unknown'}`;
        compileStatus.style.color = '#ef4444';
      }
    });
  });

  // -------------------------------------------------------------
  // 2. Real-Time Network Request Logger
  // -------------------------------------------------------------
  const loggerTbody = document.getElementById('logger-tbody');
  const btnClearLogs = document.getElementById('btn-clear-logs');
  const logSearch = document.getElementById('log-search');

  let allLogs = [];

  const { blockLogs = [] } = await chrome.storage.local.get('blockLogs');
  allLogs = blockLogs;
  renderLogs();

  function renderLogs() {
    loggerTbody.innerHTML = '';
    const query = (logSearch.value || '').toLowerCase();
    const filtered = allLogs.filter((entry) => {
      if (!query) return true;
      return (
        entry.url.toLowerCase().includes(query) ||
        entry.initiator.toLowerCase().includes(query) ||
        String(entry.ruleId).includes(query)
      );
    });

    if (filtered.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="5" style="text-align: center; color: #64748b; padding: 20px;">No blocked requests recorded yet. Browse the web to see real-time blocks.</td>`;
      loggerTbody.appendChild(tr);
      return;
    }

    filtered.slice(0, 100).forEach((entry) => {
      const tr = document.createElement('tr');
      const truncatedUrl = entry.url.length > 55 ? entry.url.substring(0, 55) + '...' : entry.url;
      const cleanInitiator = entry.initiator.replace(/^https?:\/\//, '');

      tr.innerHTML = `
        <td style="color: #64748b;">${entry.timestamp}</td>
        <td><span class="badge-blocked">${entry.type}</span></td>
        <td title="${entry.url}">${truncatedUrl}</td>
        <td><span class="badge-rule">#${entry.ruleId}</span></td>
        <td style="color: #94a3b8;">${cleanInitiator}</td>
      `;
      loggerTbody.appendChild(tr);
    });
  }

  logSearch.addEventListener('input', renderLogs);

  btnClearLogs.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'clearLogs' }, () => {
      allLogs = [];
      renderLogs();
    });
  });

  // Listen for live blocked requests broadcasted from background worker
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'newBlockLog' && message.entry) {
      allLogs.unshift(message.entry);
      if (allLogs.length > 150) allLogs.pop();
      renderLogs();
    }
  });

  // -------------------------------------------------------------
  // 3. Self-Healing DOM Signatures
  // -------------------------------------------------------------
  const semanticList = document.getElementById('semantic-list');
  const btnClearSemantic = document.getElementById('btn-clear-semantic');

  async function loadSemanticRules() {
    semanticList.innerHTML = '';
    const { semanticRules = [] } = await chrome.storage.local.get('semanticRules');

    if (semanticRules.length === 0) {
      semanticList.innerHTML = `<div style="text-align: center; color: #64748b; padding: 20px; font-size: 11px;">No custom element signatures saved yet. Use the "Pick & Heal Element" button in the popup to block resilient elements.</div>`;
      return;
    }

    semanticRules.forEach((sig, idx) => {
      const card = document.createElement('div');
      card.className = 'semantic-card';
      const attrsStr = Object.entries(sig.semanticAttrs || {})
        .map(([k, v]) => `${k}="${v}"`)
        .join(', ');

      card.innerHTML = `
        <div class="semantic-card-header">
          <span class="semantic-tag">&lt;${sig.tagName}&gt;</span>
          <span style="font-size: 10px; color: #64748b;">${new Date(sig.created || Date.now()).toLocaleDateString()}</span>
        </div>
        <div class="semantic-desc"><strong>Path:</strong> ${sig.structure}</div>
        ${attrsStr ? `<div class="semantic-desc"><strong>Attrs:</strong> ${attrsStr}</div>` : ''}
        ${sig.textSnippet ? `<div class="semantic-desc"><strong>Anchor:</strong> "${sig.textSnippet}"</div>` : ''}
      `;
      semanticList.appendChild(card);
    });
  }

  loadSemanticRules();

  btnClearSemantic.addEventListener('click', async () => {
    await chrome.storage.local.set({ semanticRules: [] });
    loadSemanticRules();
  });

  // -------------------------------------------------------------
  // 4. Help & Feedback Diagnostics
  // -------------------------------------------------------------
  const btnExportDiag = document.getElementById('btn-export-diagnostics');
  const btnGithubIssue = document.getElementById('btn-github-issue');
  const feedbackStatus = document.getElementById('feedback-status');

  if (btnExportDiag) {
    btnExportDiag.addEventListener('click', async () => {
      try {
        const stored = await chrome.storage.local.get(null);
        const dynamicRules = await chrome.declarativeNetRequest.getDynamicRules();

        const diagBundle = {
          extension: 'Semantic Shield',
          version: '2.0.0',
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          shieldActive: stored.shieldActive !== false,
          blockGenAI: stored.blockGenAI !== false,
          collapseSludge: stored.collapseSludge !== false,
          blockedTotalCount: stored.blockedCount || 0,
          dynamicRulesRegistered: dynamicRules.length,
          semanticSignaturesCount: (stored.semanticRules || []).length,
          recentBlockSamples: (stored.blockLogs || []).slice(0, 5),
          compilerErrors: stored.compilerErrors || [],
        };

        const jsonStr = JSON.stringify(diagBundle, null, 2);
        await navigator.clipboard.writeText(jsonStr);

        if (feedbackStatus) {
          feedbackStatus.textContent = 'Diagnostic bundle copied to clipboard! Paste it into your bug report.';
          feedbackStatus.style.color = '#10b981';
        }
      } catch (err) {
        if (feedbackStatus) {
          feedbackStatus.textContent = `Error copying diagnostics: ${err.message}`;
          feedbackStatus.style.color = '#ef4444';
        }
      }
    });
  }

  if (btnGithubIssue) {
    btnGithubIssue.addEventListener('click', () => {
      const issueUrl = 'https://github.com/jesusdelira7-956/Semantic-Shield/issues/new?title=[Bug]+Semantic+Shield+Report&labels=bug,extension';
      chrome.tabs.create({ url: issueUrl });
    });
  }
});
