/**
 * Semantic Shield - Content Shield Script
 * Enforces validated cosmetic hiding, catalog-driven GenAI widget blocking,
 * domain-scoped self-healing semantic suppression, AI sludge collapsing,
 * and Indirect Prompt Injection (IPI) hidden-text defense.
 * Classic content script (no top-level ES module export/import).
 */

(async function () {
  'use strict';

  let config = {
    shieldActive: true,
    blockGenAI: true,
    collapseSludge: true,
    scanIPI: true,
    cosmeticRules: [],
    semanticRules: [],
  };

  const suppressedNodes = new WeakSet();
  const checkedSludgeNodes = new WeakSet();
  const scannedIpiNodes = new WeakSet();
  let ipiHitsOnPage = [];
  let recordedSignatures = new Set();
  let lastAppliedCss = '';

  try {
    const stored = await chrome.storage.local.get([
      'shieldActive',
      'blockGenAI',
      'collapseSludge',
      'scanIPI',
      'cosmeticRules',
      'semanticRules',
    ]);
    config = { ...config, ...stored };
  } catch (_) {}

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    for (const key of Object.keys(changes)) {
      if (key in config) {
        config[key] = changes[key].newValue;
      }
    }
    scheduleDOMClean();
  });

  // Inject Base Anti-Ad & GenAI Suppression CSS
  const styleEl = document.createElement('style');
  styleEl.id = 'semantic-shield-style';
  (document.head || document.documentElement).appendChild(styleEl);

  function updateDynamicStyles() {
    if (!config.shieldActive) {
      if (lastAppliedCss !== '') {
        styleEl.textContent = '';
        lastAppliedCss = '';
      }
      return;
    }

    const currentHost = window.location.hostname || '';
    const rawSelectors = [];

    for (const rule of config.cosmeticRules || []) {
      if (rule && rule.selector && (rule.domain === '*' || currentHost.includes(rule.domain))) {
        rawSelectors.push(rule.selector);
      }
    }

    if (config.blockGenAI && Array.isArray(window.GENAI_WIDGET_CATALOG)) {
      for (const entry of window.GENAI_WIDGET_CATALOG) {
        if (!entry.domain || currentHost.includes(entry.domain)) {
          rawSelectors.push(...(entry.selectors || []));
        }
      }
    }

    const validSelectors = [];
    const seen = new Set();
    const isValid = window.SemanticHeuristics?.isValidCssSelector;

    for (const sel of rawSelectors) {
      if (seen.has(sel)) continue;
      seen.add(sel);
      if (!isValid || isValid(sel)) {
        validSelectors.push(sel);
      }
    }

    const nextCss =
      validSelectors.length > 0
        ? `${validSelectors.join(', ')} { display: none !important; opacity: 0 !important; pointer-events: none !important; }`
        : '';

    if (nextCss !== lastAppliedCss) {
      styleEl.textContent = nextCss;
      lastAppliedCss = nextCss;
    }
  }

  updateDynamicStyles();

  let debounceTimer = null;
  let rafPending = false;

  function scheduleDOMClean() {
    if (!config.shieldActive) {
      updateDynamicStyles();
      return;
    }
    if (debounceTimer) return;
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        runDOMPass();
      });
    }, 150);
  }

  function detectConcealmentReasons(el) {
    const reasons = [];
    if (el.getAttribute('aria-hidden') === 'true') {
      reasons.push('aria-hidden');
    }

    let cs;
    try {
      cs = window.getComputedStyle(el);
    } catch (_) {
      return reasons;
    }

    if (cs.opacity === '0') reasons.push('opacity-0');
    const fontSize = parseFloat(cs.fontSize);
    if (!Number.isNaN(fontSize) && fontSize <= 1) reasons.push('zero-font');
    if (cs.display === 'none' || cs.visibility === 'hidden') reasons.push('hidden-css');

    const leftVal = parseFloat(cs.left);
    if (!Number.isNaN(leftVal) && leftVal <= -5000) reasons.push('offscreen-left');

    if (
      cs.color &&
      cs.backgroundColor &&
      cs.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
      cs.backgroundColor !== 'transparent' &&
      cs.color === cs.backgroundColor
    ) {
      reasons.push('same-color-camouflage');
    }

    return reasons;
  }

  function renderIpiWarningPill() {
    if (!document.body || ipiHitsOnPage.length === 0) return;
    let banner = document.getElementById('ag-ipi-warning-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'ag-ipi-warning-banner';
      banner.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        z-index: 2147483645;
        background: #1e1b4b;
        border: 1px solid #f59e0b;
        color: #fef3c7;
        padding: 8px 14px;
        border-radius: 8px;
        font-size: 12px;
        font-family: system-ui, sans-serif;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.45);
      `;

      const textSpan = document.createElement('span');
      textSpan.id = 'ag-ipi-warning-text';

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.textContent = 'Dismiss';
      closeBtn.style.cssText = `
        background: #f59e0b;
        color: #0f172a;
        border: none;
        border-radius: 4px;
        padding: 2px 8px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
      `;
      closeBtn.addEventListener('click', () => {
        banner.style.display = 'none';
        banner.dataset.dismissed = 'true';
      });

      banner.append(textSpan, closeBtn);
      document.body.appendChild(banner);
    }

    if (banner.dataset.dismissed === 'true') return;
    const textSpan = document.getElementById('ag-ipi-warning-text');
    if (textSpan) {
      textSpan.textContent = `🛡️ Semantic Shield: Hidden Prompt Injection Flagged (${ipiHitsOnPage.length})`;
    }
  }

  function recordIpiHit(text, evalRes) {
    const snippet = text.trim().replace(/\s+/g, ' ').slice(0, 140);
    const key = `${evalRes.matchedPatterns.join(',')}:${snippet.slice(0, 50)}`;
    if (recordedSignatures.has(key)) return;
    recordedSignatures.add(key);

    const hit = {
      hostname: window.location.hostname || 'unknown',
      severity: evalRes.severity,
      reasons: evalRes.reasons,
      matchedPatterns: evalRes.matchedPatterns,
      snippet,
      timestamp: new Date().toLocaleTimeString(),
    };
    ipiHitsOnPage.push(hit);
    renderIpiWarningPill();

    try {
      chrome.runtime.sendMessage({ action: 'recordIPIAlert', alert: hit }).catch(() => {});
    } catch (_) {}
  }

  function scanForHiddenIPI() {
    const heuristics = window.SemanticHeuristics;
    if (!heuristics || typeof heuristics.evaluateIPIRisk !== 'function') return;

    // 1. Inspect HTML comments via TreeWalker
    try {
      const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_COMMENT);
      let node;
      let commentCount = 0;
      while ((node = walker.nextNode()) && commentCount < 250) {
        commentCount++;
        if (scannedIpiNodes.has(node)) continue;
        scannedIpiNodes.add(node);

        const commentText = (node.nodeValue || '').trim();
        if (commentText.length > 20) {
          const res = heuristics.evaluateIPIRisk(commentText, ['html-comment']);
          if (res.isSuspicious) {
            recordIpiHit(commentText, res);
          }
        }
      }
    } catch (_) {}

    // 2. Inspect concealed DOM text elements
    if (!document.body) return;
    const nodes = document.body.querySelectorAll('p, span, div, section, aside, blockquote, pre, code');
    const limit = Math.min(nodes.length, 400);

    for (let i = 0; i < limit; i++) {
      const el = nodes[i];
      if (scannedIpiNodes.has(el) || suppressedNodes.has(el)) continue;
      if (el.id && el.id.startsWith('ag-')) continue;
      scannedIpiNodes.add(el);

      if (el.children.length > 8) continue;
      const text = (el.textContent || '').trim();
      if (text.length < 20 || text.length > 4000) continue;

      const reasons = detectConcealmentReasons(el);
      if (reasons.includes('aria-hidden') && text.length <= 40 && reasons.length === 1) {
        continue;
      }

      const res = heuristics.evaluateIPIRisk(text, reasons);
      if (res.isSuspicious) {
        recordIpiHit(text, res);
      }
    }
  }

  function runDOMPass() {
    updateDynamicStyles();
    if (!config.shieldActive) return;

    const currentHost = window.location.hostname || '';
    const heuristics = window.SemanticHeuristics;
    if (!heuristics) return;

    // 1. Apply Domain-Scoped Self-Healing Semantic Signatures
    const hostRules = (config.semanticRules || []).filter((sig) =>
      heuristics.matchesHostname(sig, currentHost)
    );

    if (hostRules.length > 0) {
      const candidates = document.querySelectorAll('div, section, article, aside, span, p');
      for (let i = 0; i < candidates.length; i++) {
        const el = candidates[i];
        if (suppressedNodes.has(el)) continue;

        for (const sig of hostRules) {
          if (heuristics.matchesSignature(el, sig, currentHost)) {
            el.style.display = 'none';
            suppressedNodes.add(el);
            break;
          }
        }
      }
    }

    // 2. Collapse AI Sludge Articles / Posts
    if (config.collapseSludge) {
      const textBlocks = document.querySelectorAll('article, .post, .entry-content, [data-testid="tweetText"]');
      for (let i = 0; i < textBlocks.length; i++) {
        const el = textBlocks[i];
        if (checkedSludgeNodes.has(el)) continue;
        checkedSludgeNodes.add(el);

        const text = el.innerText || '';
        if (text.length > 200) {
          const evalRes = heuristics.evaluateSludgeScore(text);
          if (evalRes.isSludge) {
            collapseSludgeElement(el, evalRes.hits);
          }
        }
      }
    }

    // 3. Scan for Indirect Prompt Injection (IPI)
    if (config.scanIPI !== false) {
      scanForHiddenIPI();
    }
  }

  function collapseSludgeElement(el, hits) {
    if (!el.parentNode) return;

    const originalDisplay = el.style.display;
    el.style.display = 'none';

    const banner = document.createElement('div');
    banner.className = 'ag-sludge-collapsed-bar';
    banner.style.cssText = `
      background: rgba(30, 41, 59, 0.85);
      border: 1px dashed #64748b;
      border-radius: 6px;
      color: #94a3b8;
      font-size: 12px;
      padding: 6px 12px;
      margin: 8px 0;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: all 0.2s ease;
      font-family: system-ui, sans-serif;
    `;

    const left = document.createElement('span');
    const strong = document.createElement('strong');
    strong.textContent = 'Synthetic/AI Content Collapsed';
    left.append('⚡ ', strong, ` (${Number(hits)} formulaic patterns detected)`);

    const right = document.createElement('span');
    right.style.cssText = 'color: #38bdf8; text-decoration: underline;';
    right.textContent = 'Click to reveal';

    banner.append(left, right);

    banner.addEventListener('click', () => {
      el.style.display = originalDisplay;
      banner.remove();
    });

    el.parentNode.insertBefore(banner, el);
  }

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.target === styleEl || (m.target.id && m.target.id === 'ag-ipi-warning-banner')) continue;
      scheduleDOMClean();
      return;
    }
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
    scheduleDOMClean();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
        scheduleDOMClean();
      }
    });
  }

  chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
    if (!req) return;

    if (req.action === 'launchElementPicker') {
      if (window.SemanticShieldElementPicker) {
        window.SemanticShieldElementPicker.start();
        sendResponse({ started: true });
      } else {
        sendResponse({ started: false, error: 'Picker module not loaded' });
      }
      return;
    }

    if (req.action === 'inspectPageSecurity') {
      if (config.scanIPI !== false) {
        scanForHiddenIPI();
      }
      const declarativeTools = document.querySelectorAll('[toolname], [tooldescription]');
      const webmcpDetected =
        (typeof navigator !== 'undefined' && 'modelContext' in navigator) ||
        declarativeTools.length > 0;

      sendResponse({
        hostname: window.location.hostname || 'unknown',
        webmcpDetected,
        webmcpDeclarativeCount: declarativeTools.length,
        ipiHitsOnPage: ipiHitsOnPage.slice(),
      });
    }
  });
})();
