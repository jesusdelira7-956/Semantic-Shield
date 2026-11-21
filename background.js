/**
 * Semantic Shield - Background Service Worker (Manifest V3)
 * Handles rule compilation, master shield DNR toggle, live network debug logging,
 * badge stats, and message routing.
 */

import { FilterCompiler } from './lib/filter_compiler.js';

const DEFAULT_USER_FILTERS = `! === Semantic Shield Local LLM Loopback Protection ===
||127.0.0.1^$domain=~127.0.0.1|~localhost
||localhost^$domain=~127.0.0.1|~localhost
||[::1]^$domain=~127.0.0.1|~localhost

! === Custom Ad & Tracker Overrides ===
||adnxs.com^$image,script
||criteo.com^$script

! === Custom Cosmetic Rules ===
##div[data-testid="GrokDrawer"]
`;

const MAX_LOG_ENTRIES = 150;
const STATIC_RULESETS = ['ruleset_local_llm', 'ruleset_core_ads'];
const DEBUG_FEEDBACK_AVAILABLE = Boolean(chrome.declarativeNetRequest?.onRuleMatchedDebug);

function applyBadgeCounterStyle() {
  if (!DEBUG_FEEDBACK_AVAILABLE) {
    chrome.declarativeNetRequest
      .setExtensionActionOptions({ displayActionCountAsBadgeText: true })
      .catch((err) => console.warn('[Semantic Shield] Badge action count unavailable:', err));
  }
}

applyBadgeCounterStyle();

/**
 * Synchronizes Chrome DeclarativeNetRequest rulesets & dynamic rules with master shieldActive toggle.
 */
async function syncShieldState(isActive) {
  try {
    if (!isActive) {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        disableRulesetIds: STATIC_RULESETS,
      });
      const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
      if (existingRules.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: existingRules.map((r) => r.id),
        });
      }
      if (!DEBUG_FEEDBACK_AVAILABLE) {
        await chrome.declarativeNetRequest.setExtensionActionOptions({
          displayActionCountAsBadgeText: false,
        }).catch(() => {});
      }
      await chrome.action.setBadgeText({ text: 'OFF' });
      await chrome.action.setBadgeBackgroundColor({ color: '#64748b' });
      console.log('[Semantic Shield] Master toggle OFF: DNR rulesets & dynamic rules paused.');
      return;
    }

    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: STATIC_RULESETS,
    });

    const { userFilters = DEFAULT_USER_FILTERS, blockedCount = 0 } = await chrome.storage.local.get([
      'userFilters',
      'blockedCount',
    ]);
    await compileAndApplyUserFilters(userFilters);

    if (DEBUG_FEEDBACK_AVAILABLE) {
      await chrome.action.setBadgeText({
        text: blockedCount > 0 ? String(blockedCount > 999 ? '999+' : blockedCount) : '',
      });
      await chrome.action.setBadgeBackgroundColor({ color: '#00e5ff' });
    } else {
      await chrome.action.setBadgeText({ text: '' });
      applyBadgeCounterStyle();
    }
    console.log('[Semantic Shield] Master toggle ON: DNR rulesets & dynamic rules active.');
  } catch (err) {
    console.error('[Semantic Shield] Failed to sync shield state:', err);
  }
}

// Keep DNR state synchronized when shieldActive is toggled from Popup or Storage
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.shieldActive) {
    syncShieldState(changes.shieldActive.newValue !== false);
  }
});

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Semantic Shield] Extension installed / updated:', details.reason);

  // Pillar 2 Data Loss Prevention: Pre-update snapshot guard (strip old snapshots to avoid 2^N bloat)
  if (details.reason === 'update') {
    try {
      const allLocal = await chrome.storage.local.get(null);
      const snapshotPayload = {};
      const existingBackupKeys = [];

      for (const [k, v] of Object.entries(allLocal)) {
        if (k.startsWith('backup_pre_upgrade_')) {
          existingBackupKeys.push(k);
        } else {
          snapshotPayload[k] = v;
        }
      }

      const backupKey = `backup_pre_upgrade_${details.previousVersion || 'v2'}_${Date.now()}`;
      await chrome.storage.local.set({ [backupKey]: snapshotPayload });

      const allBackupKeys = [...existingBackupKeys, backupKey].sort((a, b) => {
        const tsA = Number(a.split('_').pop()) || 0;
        const tsB = Number(b.split('_').pop()) || 0;
        return tsA - tsB;
      });
      if (allBackupKeys.length > 2) {
        await chrome.storage.local.remove(allBackupKeys.slice(0, allBackupKeys.length - 2));
      }

      console.log(`[Semantic Shield] Safety snapshot saved to ${backupKey}`);
    } catch (err) {
      console.error('[Semantic Shield] Error creating pre-update snapshot:', err);
    }
  }

  const stored = await chrome.storage.local.get([
    'shieldActive',
    'blockGenAI',
    'collapseSludge',
    'scanIPI',
    'userFilters',
    'blockLogs',
    'blockedCount',
    'semanticRules',
    'ipiAlerts',
  ]);

  // Pillar 2: Cloud auto-recovery from chrome.storage.sync on fresh install/device change
  if (details.reason === 'install') {
    try {
      const cloudSync = await chrome.storage.sync.get(['userFilters', 'semanticRules']);
      if (cloudSync.userFilters) {
        stored.userFilters = cloudSync.userFilters;
        console.log('[Semantic Shield] Recovered user filters from Chrome Cloud Sync.');
      }
      if (Array.isArray(cloudSync.semanticRules) && cloudSync.semanticRules.length > 0) {
        stored.semanticRules = cloudSync.semanticRules;
        await chrome.storage.local.set({ semanticRules: cloudSync.semanticRules });
      }
    } catch (err) {
      console.warn('[Semantic Shield] Cloud sync recovery skipped:', err);
    }
  }

  const updates = {};
  if (stored.shieldActive === undefined) updates.shieldActive = true;
  if (stored.blockGenAI === undefined) updates.blockGenAI = true;
  if (stored.collapseSludge === undefined) updates.collapseSludge = true;
  if (stored.scanIPI === undefined) updates.scanIPI = true;
  if (stored.blockedCount === undefined) updates.blockedCount = 0;
  if (!stored.blockLogs) updates.blockLogs = [];
  if (!stored.ipiAlerts) updates.ipiAlerts = [];
  if (!stored.userFilters) updates.userFilters = DEFAULT_USER_FILTERS;

  if (Object.keys(updates).length > 0) {
    await chrome.storage.local.set(updates);
  }

  const isActive = (updates.shieldActive ?? stored.shieldActive) !== false;
  await syncShieldState(isActive);
});

/**
 * Compiles user filters text and updates DNR dynamic rules.
 */
async function compileAndApplyUserFilters(filterText) {
  try {
    const compiler = new FilterCompiler(10000);
    const { dynamicRules, cosmeticRules, errors } = compiler.compile(filterText);

    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map((r) => r.id);

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules: dynamicRules,
    });

    await chrome.storage.local.set({
      cosmeticRules,
      compilerErrors: errors,
      lastCompiledAt: Date.now(),
      dynamicRuleCount: dynamicRules.length,
    });

    try {
      await chrome.storage.sync.set({ userFilters: filterText });
    } catch (_) {}

    console.log(`[Semantic Shield] Compiled ${dynamicRules.length} dynamic rules, ${cosmeticRules.length} cosmetic rules.`);
    return { success: true, dynamicCount: dynamicRules.length, cosmeticCount: cosmeticRules.length, errors };
  } catch (err) {
    console.error('[Semantic Shield] Compilation failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Live Network Request Debug Logger (available in developer unpacked mode)
 */
if (DEBUG_FEEDBACK_AVAILABLE) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(async (info) => {
    try {
      const { request, rule } = info;
      const logEntry = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        url: request.url,
        method: request.method || 'GET',
        initiator: request.initiator || 'external',
        ruleId: rule.ruleId,
        rulesetId: rule.rulesetId || 'dynamic',
        type: request.type,
      };

      const data = await chrome.storage.local.get(['blockLogs', 'blockedCount', 'shieldActive']);
      if (data.shieldActive === false) return;

      const logs = data.blockLogs || [];
      logs.unshift(logEntry);
      if (logs.length > MAX_LOG_ENTRIES) logs.pop();

      const newCount = (data.blockedCount || 0) + 1;
      await chrome.storage.local.set({ blockLogs: logs, blockedCount: newCount });

      await chrome.action.setBadgeText({ text: String(newCount > 999 ? '999+' : newCount) });
      await chrome.action.setBadgeBackgroundColor({ color: '#00e5ff' });

      chrome.runtime.sendMessage({ action: 'newBlockLog', entry: logEntry }).catch(() => {});
    } catch (_) {
      // Ignore background race errors
    }
  });
}

/**
 * Message Dispatcher for popup, sidepanel, and content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.action === 'recompileFilters') {
        const { shieldActive = true } = await chrome.storage.local.get('shieldActive');
        if (shieldActive === false) {
          await chrome.storage.local.set({ userFilters: message.filterText });
          sendResponse({
            success: true,
            dynamicCount: 0,
            cosmeticCount: 0,
            errors: ['Shield is currently paused; rules saved and will activate when resumed.'],
          });
          return;
        }
        const res = await compileAndApplyUserFilters(message.filterText);
        sendResponse(res);
      } else if (message.action === 'openSidePanel') {
        if (message.targetTab) {
          const tabStore = chrome.storage.session || chrome.storage.local;
          await tabStore.set({ pendingSidePanelTab: message.targetTab }).catch(() => {});
        }
        const windowId = sender.tab?.windowId || message.windowId || (await chrome.windows.getCurrent()).id;
        await chrome.sidePanel.open({ windowId });
        if (message.targetTab) {
          chrome.runtime.sendMessage({ action: 'switchTab', tabId: message.targetTab }).catch(() => {});
        }
        sendResponse({ success: true });
      } else if (message.action === 'clearLogs') {
        await chrome.storage.local.set({ blockLogs: [], blockedCount: 0 });
        await chrome.action.setBadgeText({ text: '' });
        sendResponse({ success: true });
      } else if (message.action === 'saveSemanticRule') {
        const { semanticRules = [] } = await chrome.storage.local.get('semanticRules');
        const rule = {
          id: message.rule?.id || `sig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          ...message.rule,
        };
        semanticRules.push(rule);
        await chrome.storage.local.set({ semanticRules });
        try {
          await chrome.storage.sync.set({ semanticRules });
        } catch (_) {}
        sendResponse({ success: true, count: semanticRules.length, rule });
      } else if (message.action === 'deleteSemanticRule') {
        const { semanticRules = [] } = await chrome.storage.local.get('semanticRules');
        let nextRules = semanticRules;
        if (message.id) {
          nextRules = semanticRules.filter((r) => r.id !== message.id);
        } else if (typeof message.index === 'number') {
          nextRules = semanticRules.filter((_, idx) => idx !== message.index);
        }
        await chrome.storage.local.set({ semanticRules: nextRules });
        try {
          await chrome.storage.sync.set({ semanticRules: nextRules });
        } catch (_) {}
        sendResponse({ success: true, count: nextRules.length });
      } else if (message.action === 'recordIPIAlert' && message.alert) {
        const { ipiAlerts = [] } = await chrome.storage.local.get('ipiAlerts');
        ipiAlerts.unshift(message.alert);
        if (ipiAlerts.length > 50) ipiAlerts.length = 50;
        await chrome.storage.local.set({ ipiAlerts });
        sendResponse({ success: true, count: ipiAlerts.length });
      } else if (message.action === 'clearIPIAlerts') {
        await chrome.storage.local.set({ ipiAlerts: [] });
        sendResponse({ success: true });
      } else {
        sendResponse({ status: 'unknown_action' });
      }
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  })();
  return true;
});
