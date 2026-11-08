/**
 * Antigravity Semantic Shield - Background Service Worker (Manifest V3)
 * Handles rule compilation, live network debug logging, badge stats, and message routing.
 */

import { FilterCompiler } from './lib/filter_compiler.js';

const DEFAULT_USER_FILTERS = `! === Antigravity Local LLM Loopback Protection ===
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

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Antigravity Shield] Extension installed / updated:', details.reason);

  const stored = await chrome.storage.local.get([
    'shieldActive',
    'blockGenAI',
    'collapseSludge',
    'userFilters',
    'blockLogs',
    'blockedCount',
  ]);

  const updates = {};
  if (stored.shieldActive === undefined) updates.shieldActive = true;
  if (stored.blockGenAI === undefined) updates.blockGenAI = true;
  if (stored.collapseSludge === undefined) updates.collapseSludge = true;
  if (stored.blockedCount === undefined) updates.blockedCount = 0;
  if (!stored.blockLogs) updates.blockLogs = [];
  if (!stored.userFilters) updates.userFilters = DEFAULT_USER_FILTERS;

  if (Object.keys(updates).length > 0) {
    await chrome.storage.local.set(updates);
  }

  // Initial compilation of User Filters into DNR Dynamic Rules
  const filtersToCompile = updates.userFilters || stored.userFilters || DEFAULT_USER_FILTERS;
  await compileAndApplyUserFilters(filtersToCompile);
});

/**
 * Compiles user filters text and updates DNR dynamic rules.
 */
async function compileAndApplyUserFilters(filterText) {
  try {
    const compiler = new FilterCompiler(10000);
    const { dynamicRules, cosmeticRules, errors } = compiler.compile(filterText);

    // Fetch existing dynamic rules to clear old ones
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

    console.log(`[Antigravity Shield] Compiled ${dynamicRules.length} dynamic rules, ${cosmeticRules.length} cosmetic rules.`);
    return { success: true, dynamicCount: dynamicRules.length, cosmeticCount: cosmeticRules.length, errors };
  } catch (err) {
    console.error('[Antigravity Shield] Compilation failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Live Network Request Debug Logger (available in developer unpacked mode)
 */
if (chrome.declarativeNetRequest?.onRuleMatchedDebug) {
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

      // Update badge
      await chrome.action.setBadgeText({ text: String(newCount > 999 ? '999+' : newCount) });
      await chrome.action.setBadgeBackgroundColor({ color: '#00e5ff' });

      // Notify open sidepanel / popup if listening
      chrome.runtime.sendMessage({ action: 'newBlockLog', entry: logEntry }).catch(() => {});
    } catch (err) {
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
        const res = await compileAndApplyUserFilters(message.filterText);
        sendResponse(res);
      } else if (message.action === 'openSidePanel') {
        const windowId = sender.tab?.windowId || message.windowId;
        if (windowId) {
          await chrome.sidePanel.open({ windowId });
          sendResponse({ success: true });
        } else {
          const currentWindow = await chrome.windows.getCurrent();
          await chrome.sidePanel.open({ windowId: currentWindow.id });
          sendResponse({ success: true });
        }
      } else if (message.action === 'clearLogs') {
        await chrome.storage.local.set({ blockLogs: [], blockedCount: 0 });
        await chrome.action.setBadgeText({ text: '' });
        sendResponse({ success: true });
      } else if (message.action === 'saveSemanticRule') {
        const { semanticRules = [] } = await chrome.storage.local.get('semanticRules');
        semanticRules.push(message.rule);
        await chrome.storage.local.set({ semanticRules });
        sendResponse({ success: true, count: semanticRules.length });
      } else {
        sendResponse({ status: 'unknown_action' });
      }
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  })();
  return true; // Keep message channel open for async response
});
