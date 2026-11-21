/**
 * Semantic Shield - Side Panel Controller
 */

import { SemanticBuiltInAI } from '../lib/builtin_ai.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Tabs Navigation
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  function activateTab(tabId) {
    if (!tabId) return;
    const target = document.getElementById(tabId);
    if (!target) return;
    tabBtns.forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === tabId);
    });
    tabContents.forEach((c) => {
      c.classList.toggle('active', c.id === tabId);
    });
  }

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
  });

  // Honor pending targetTab when opened from Popup ("Help & Report Issue")
  try {
    const tabStore = chrome.storage.session || chrome.storage.local;
    const { pendingSidePanelTab } = await tabStore.get('pendingSidePanelTab');
    if (pendingSidePanelTab) {
      activateTab(pendingSidePanelTab);
      await tabStore.remove('pendingSidePanelTab');
    }
  } catch (_) {}

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
        const errSuffix = res.errors && res.errors.length > 0 ? ` (${res.errors.length} notice: ${res.errors[0]})` : '';
        compileStatus.textContent = `Compiled! ${res.dynamicCount} dynamic network rules + ${res.cosmeticCount} cosmetic rules active.${errSuffix}`;
        compileStatus.style.color = res.errors?.length ? '#f59e0b' : '#10b981';
      } else {
        compileStatus.textContent = `Compilation error: ${res?.error || 'Unknown'}`;
        compileStatus.style.color = '#ef4444';
      }
    });
  });

  // -------------------------------------------------------------
  // 2. Real-Time Network Request Logger (XSS-safe DOM creation)
  // -------------------------------------------------------------
  const loggerTbody = document.getElementById('logger-tbody');
  const btnClearLogs = document.getElementById('btn-clear-logs');
  const logSearch = document.getElementById('log-search');

  let allLogs = [];

  const liveStreamAvailable = Boolean(chrome.declarativeNetRequest?.onRuleMatchedDebug);
  const loggerSubtitle = document.getElementById('logger-subtitle');
  if (!liveStreamAvailable && loggerSubtitle) {
    loggerSubtitle.textContent =
      'Per-request stream is available in developer (unpacked) mode. Blocking remains fully active; the toolbar badge shows blocks per tab.';
  }

  const { blockLogs = [] } = await chrome.storage.local.get('blockLogs');
  allLogs = blockLogs;
  renderLogs();

  function renderLogs() {
    loggerTbody.replaceChildren();
    const query = (logSearch.value || '').toLowerCase();
    const filtered = allLogs.filter((entry) => {
      if (!query) return true;
      return (
        String(entry.url || '').toLowerCase().includes(query) ||
        String(entry.initiator || '').toLowerCase().includes(query) ||
        String(entry.ruleId || '').includes(query)
      );
    });

    if (filtered.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 5;
      td.style.cssText = 'text-align: center; color: #64748b; padding: 20px;';
      td.textContent = 'No blocked requests recorded yet. Browse the web to see real-time blocks.';
      tr.appendChild(td);
      loggerTbody.appendChild(tr);
      return;
    }

    filtered.slice(0, 100).forEach((entry) => {
      const tr = document.createElement('tr');

      const tdTime = document.createElement('td');
      tdTime.style.color = '#64748b';
      tdTime.textContent = String(entry.timestamp || '');

      const tdType = document.createElement('td');
      const typeSpan = document.createElement('span');
      typeSpan.className = 'badge-blocked';
      typeSpan.textContent = String(entry.type || 'other');
      tdType.appendChild(typeSpan);

      const urlStr = String(entry.url || '');
      const tdUrl = document.createElement('td');
      tdUrl.title = urlStr;
      tdUrl.textContent = urlStr.length > 55 ? `${urlStr.slice(0, 55)}...` : urlStr;

      const tdRule = document.createElement('td');
      const ruleSpan = document.createElement('span');
      ruleSpan.className = 'badge-rule';
      ruleSpan.textContent = `#${entry.ruleId}`;
      tdRule.appendChild(ruleSpan);

      const tdInit = document.createElement('td');
      tdInit.style.color = '#94a3b8';
      tdInit.textContent = String(entry.initiator || '').replace(/^https?:\/\//, '');

      tr.append(tdTime, tdType, tdUrl, tdRule, tdInit);
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

  // Listen for live runtime events (logs or switchTab requests)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'newBlockLog' && message.entry) {
      allLogs.unshift(message.entry);
      if (allLogs.length > 150) allLogs.pop();
      renderLogs();
    } else if (message.action === 'switchTab' && message.tabId) {
      activateTab(message.tabId);
    }
  });

  // -------------------------------------------------------------
  // 3. Self-Healing DOM Signatures (XSS-safe + domain-scoped + deletable)
  // -------------------------------------------------------------
  const semanticList = document.getElementById('semantic-list');
  const btnClearSemantic = document.getElementById('btn-clear-semantic');

  async function loadSemanticRules() {
    semanticList.replaceChildren();
    const { semanticRules = [] } = await chrome.storage.local.get('semanticRules');

    if (semanticRules.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'text-align: center; color: #64748b; padding: 20px; font-size: 11px;';
      empty.textContent =
        'No custom element signatures saved yet. Use the "Pick & Heal Element" button in the popup to block resilient elements.';
      semanticList.appendChild(empty);
      return;
    }

    semanticRules.forEach((sig, idx) => {
      const card = document.createElement('div');
      card.className = 'semantic-card';

      const header = document.createElement('div');
      header.className = 'semantic-card-header';

      const leftGroup = document.createElement('div');
      leftGroup.style.cssText = 'display: flex; align-items: center; gap: 6px;';

      const tagSpan = document.createElement('span');
      tagSpan.className = 'semantic-tag';
      tagSpan.textContent = `<${sig.tagName || 'div'}>`;

      const hostBadge = document.createElement('span');
      hostBadge.className = 'port-tag';
      hostBadge.style.cssText = 'font-size: 9px; padding: 1px 6px;';
      hostBadge.textContent = sig.hostname || 'Global';

      leftGroup.append(tagSpan, hostBadge);

      const rightGroup = document.createElement('div');
      rightGroup.style.cssText = 'display: flex; align-items: center; gap: 8px;';

      const dateSpan = document.createElement('span');
      dateSpan.style.cssText = 'font-size: 10px; color: #64748b;';
      dateSpan.textContent = new Date(sig.created || Date.now()).toLocaleDateString();

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.title = 'Delete signature';
      delBtn.style.cssText = 'background: transparent; border: none; color: #ef4444; cursor: pointer; font-weight: 700;';
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'deleteSemanticRule', id: sig.id, index: idx }, () => {
          loadSemanticRules();
        });
      });

      rightGroup.append(dateSpan, delBtn);
      header.append(leftGroup, rightGroup);
      card.appendChild(header);

      const pathDiv = document.createElement('div');
      pathDiv.className = 'semantic-desc';
      const pathStrong = document.createElement('strong');
      pathStrong.textContent = 'Path: ';
      pathDiv.append(pathStrong, String(sig.structure || ''));
      card.appendChild(pathDiv);

      const attrsStr = Object.entries(sig.semanticAttrs || {})
        .map(([k, v]) => `${k}="${v}"`)
        .join(', ');
      if (attrsStr) {
        const attrDiv = document.createElement('div');
        attrDiv.className = 'semantic-desc';
        const attrStrong = document.createElement('strong');
        attrStrong.textContent = 'Attrs: ';
        attrDiv.append(attrStrong, attrsStr);
        card.appendChild(attrDiv);
      }

      if (sig.textSnippet) {
        const anchorDiv = document.createElement('div');
        anchorDiv.className = 'semantic-desc';
        const anchorStrong = document.createElement('strong');
        anchorStrong.textContent = 'Anchor: ';
        anchorDiv.append(anchorStrong, `"${sig.textSnippet}"`);
        card.appendChild(anchorDiv);
      }

      semanticList.appendChild(card);
    });
  }

  loadSemanticRules();

  btnClearSemantic.addEventListener('click', async () => {
    await chrome.storage.local.set({ semanticRules: [] });
    try {
      await chrome.storage.sync.set({ semanticRules: [] });
    } catch (_) {}
    loadSemanticRules();
  });

  // -------------------------------------------------------------
  // 4. Perimeter Inspector (IPI & WebMCP), Hardening Snippets & Built-in AI
  // -------------------------------------------------------------
  const btnInspectPage = document.getElementById('btn-inspect-page');
  const btnClearIpi = document.getElementById('btn-clear-ipi');
  const perimeterInspectResult = document.getElementById('perimeter-inspect-result');
  const ipiAlertsList = document.getElementById('ipi-alerts-list');
  const hardeningCopyStatus = document.getElementById('hardening-copy-status');
  const builtinAiBadge = document.getElementById('builtin-ai-badge');
  const nanoCheckInput = document.getElementById('nano-check-input');
  const btnNanoVerify = document.getElementById('btn-nano-verify');
  const nanoVerifyOutput = document.getElementById('nano-verify-output');

  async function renderIpiAlerts() {
    if (!ipiAlertsList) return;
    ipiAlertsList.replaceChildren();
    const { ipiAlerts = [] } = await chrome.storage.local.get('ipiAlerts');

    if (ipiAlerts.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'color: #64748b; font-size: 11px;';
      empty.textContent = 'No hidden indirect prompt injections recorded yet.';
      ipiAlertsList.appendChild(empty);
      return;
    }

    ipiAlerts.slice(0, 15).forEach((alert) => {
      const card = document.createElement('div');
      card.className = 'semantic-card';

      const hdr = document.createElement('div');
      hdr.className = 'semantic-card-header';

      const tag = document.createElement('span');
      tag.className = 'badge-blocked';
      tag.textContent = `${String(alert.severity || 'high').toUpperCase()} • ${alert.hostname || 'page'}`;

      const time = document.createElement('span');
      time.style.cssText = 'font-size: 10px; color: #64748b;';
      time.textContent = String(alert.timestamp || '');

      hdr.append(tag, time);

      const meta = document.createElement('div');
      meta.className = 'semantic-desc';
      meta.textContent = `Signals: ${(alert.matchedPatterns || []).join(', ')} (${(alert.reasons || []).join(', ')})`;

      const snip = document.createElement('div');
      snip.className = 'semantic-desc';
      snip.textContent = `"${String(alert.snippet || '')}"`;

      card.append(hdr, meta, snip);
      ipiAlertsList.appendChild(card);
    });
  }

  renderIpiAlerts();

  if (btnInspectPage) {
    btnInspectPage.addEventListener('click', async () => {
      if (perimeterInspectResult) {
        perimeterInspectResult.textContent = 'Inspecting active tab DOM & WebMCP hooks...';
        perimeterInspectResult.style.color = '#94a3b8';
      }
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        if (perimeterInspectResult) {
          perimeterInspectResult.textContent = 'No active tab available.';
          perimeterInspectResult.style.color = '#f59e0b';
        }
        return;
      }

      chrome.tabs.sendMessage(tab.id, { action: 'inspectPageSecurity' }, (res) => {
        if (chrome.runtime.lastError || !res) {
          if (perimeterInspectResult) {
            perimeterInspectResult.textContent =
              'Unable to inspect this tab (refresh the webpage or try a standard http/https page).';
            perimeterInspectResult.style.color = '#f59e0b';
          }
          return;
        }

        const hits = (res.ipiHitsOnPage || []).length;
        const webmcpText = res.webmcpDetected
          ? `WebMCP Exposed (${res.webmcpDeclarativeCount} declarative tool nodes)`
          : 'No WebMCP tools exposed';
        if (perimeterInspectResult) {
          perimeterInspectResult.textContent = `${res.hostname}: ${webmcpText} • Hidden IPI hits on page: ${hits}`;
          perimeterInspectResult.style.color = hits > 0 ? '#f59e0b' : '#10b981';
        }
        renderIpiAlerts();
      });
    });
  }

  if (btnClearIpi) {
    btnClearIpi.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'clearIPIAlerts' }, () => {
        renderIpiAlerts();
      });
    });
  }

  document.querySelectorAll('.copy-hardening-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const cmd = btn.dataset.cmd || '';
      if (!cmd) return;
      try {
        await navigator.clipboard.writeText(cmd);
        if (hardeningCopyStatus) {
          hardeningCopyStatus.textContent = `✓ Copied: ${cmd}`;
          hardeningCopyStatus.style.color = '#10b981';
        }
      } catch (err) {
        if (hardeningCopyStatus) {
          hardeningCopyStatus.textContent = `Copy error: ${err.message}`;
          hardeningCopyStatus.style.color = '#ef4444';
        }
      }
    });
  });

  async function initBuiltInAIStatus() {
    const status = await SemanticBuiltInAI.getStatus();
    if (builtinAiBadge) {
      builtinAiBadge.textContent = status.supported ? `Nano: ${status.availability}` : 'Nano: Unavailable';
    }
    if (btnNanoVerify && !status.supported) {
      btnNanoVerify.disabled = true;
      btnNanoVerify.title = 'Chrome Built-in LanguageModel (Gemini Nano) is unavailable on this browser.';
    }
  }
  initBuiltInAIStatus();

  if (btnNanoVerify && nanoCheckInput) {
    btnNanoVerify.addEventListener('click', async () => {
      const sample = nanoCheckInput.value.trim();
      if (!sample) return;
      if (nanoVerifyOutput) {
        nanoVerifyOutput.textContent = 'Running local Gemini Nano classification...';
        nanoVerifyOutput.style.color = '#38bdf8';
      }
      try {
        const result = await SemanticBuiltInAI.classifySuspiciousText(sample);
        if (nanoVerifyOutput) {
          nanoVerifyOutput.textContent = result;
          nanoVerifyOutput.style.color = '#10b981';
        }
      } catch (err) {
        if (nanoVerifyOutput) {
          nanoVerifyOutput.textContent = err.message;
          nanoVerifyOutput.style.color = '#f59e0b';
        }
      }
    });
  }

  // -------------------------------------------------------------
  // 5. Help & Feedback Diagnostics & Backup / Restore
  // -------------------------------------------------------------
  const btnExportBackup = document.getElementById('btn-export-backup');
  const fileRestoreBackup = document.getElementById('file-restore-backup');
  const backupStatus = document.getElementById('backup-status');

  if (btnExportBackup) {
    btnExportBackup.addEventListener('click', async () => {
      try {
        const stored = await chrome.storage.local.get(null);
        const backupData = {
          app: 'Semantic Shield',
          version: chrome.runtime.getManifest().version,
          exportedAt: new Date().toISOString(),
          userFilters: stored.userFilters || '',
          semanticRules: stored.semanticRules || [],
          shieldActive: stored.shieldActive !== false,
          blockGenAI: stored.blockGenAI !== false,
          collapseSludge: stored.collapseSludge !== false,
          scanIPI: stored.scanIPI !== false,
        };

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toISOString().slice(0, 10);
        a.download = `semantic-shield-backup-${dateStr}.json`;
        a.click();
        URL.revokeObjectURL(url);

        if (backupStatus) {
          backupStatus.textContent = '✓ Backup JSON exported successfully!';
          backupStatus.style.color = '#10b981';
        }
      } catch (err) {
        if (backupStatus) {
          backupStatus.textContent = `Export failed: ${err.message}`;
          backupStatus.style.color = '#ef4444';
        }
      }
    });
  }

  if (fileRestoreBackup) {
    fileRestoreBackup.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (parsed.app !== 'Semantic Shield' && !parsed.userFilters) {
            throw new Error('Invalid backup file format.');
          }

          const updates = {};
          if (parsed.userFilters !== undefined) updates.userFilters = parsed.userFilters;
          if (Array.isArray(parsed.semanticRules)) updates.semanticRules = parsed.semanticRules;
          if (parsed.shieldActive !== undefined) updates.shieldActive = parsed.shieldActive;
          if (parsed.blockGenAI !== undefined) updates.blockGenAI = parsed.blockGenAI;
          if (parsed.collapseSludge !== undefined) updates.collapseSludge = parsed.collapseSludge;
          if (parsed.scanIPI !== undefined) updates.scanIPI = parsed.scanIPI;

          await chrome.storage.local.set(updates);

          if (updates.userFilters) {
            chrome.runtime.sendMessage({ action: 'recompileFilters', filterText: updates.userFilters });
          }

          if (backupStatus) {
            backupStatus.textContent = '✓ Backup restored successfully! Refreshing...';
            backupStatus.style.color = '#10b981';
          }
          setTimeout(() => window.location.reload(), 1200);
        } catch (err) {
          if (backupStatus) {
            backupStatus.textContent = `Restore failed: ${err.message}`;
            backupStatus.style.color = '#ef4444';
          }
        }
      };
      reader.readAsText(file);
    });
  }

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
          version: chrome.runtime.getManifest().version,
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

  const btnBuyCoffee = document.getElementById('btn-buy-coffee');
  if (btnBuyCoffee) {
    btnBuyCoffee.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://buymeacoffee.com/JesseInTheLab' });
    });
  }
});
