/**
 * Semantic Shield - Content Shield Script
 * Enforces validated cosmetic hiding, catalog-driven GenAI widget blocking,
 * domain-scoped self-healing semantic suppression, and AI sludge collapsing
 * with debounced MutationObserver + WeakSet tracking.
 * Classic content script (no top-level ES module export/import).
 */

(async function () {
  'use strict';

  let config = {
    shieldActive: true,
    blockGenAI: true,
    collapseSludge: true,
    cosmeticRules: [],
    semanticRules: [],
  };

  // Track checked / suppressed nodes without mutating DOM attributes
  const suppressedNodes = new WeakSet();
  const checkedSludgeNodes = new WeakSet();
  let lastAppliedCss = '';

  try {
    const stored = await chrome.storage.local.get([
      'shieldActive',
      'blockGenAI',
      'collapseSludge',
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

    // 1. Generic & Domain Cosmetic Rules
    for (const rule of config.cosmeticRules || []) {
      if (rule && rule.selector && (rule.domain === '*' || currentHost.includes(rule.domain))) {
        rawSelectors.push(rule.selector);
      }
    }

    // 2. Single Source of Truth GenAI Catalog from SemanticHeuristics
    if (config.blockGenAI && Array.isArray(window.GENAI_WIDGET_CATALOG)) {
      for (const entry of window.GENAI_WIDGET_CATALOG) {
        if (!entry.domain || currentHost.includes(entry.domain)) {
          rawSelectors.push(...(entry.selectors || []));
        }
      }
    }

    // Validate every selector independently so one malformed rule never breaks the sheet
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

  // Debounced + rAF-batched DOM scan
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

  function runDOMPass() {
    updateDynamicStyles();
    if (!config.shieldActive) return;

    const currentHost = window.location.hostname || '';
    const heuristics = window.SemanticHeuristics;
    if (!heuristics) return;

    // 1. Apply Domain-Scoped Self-Healing Semantic Signatures (skip scan if none match this host)
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

  // MutationObserver to clean dynamic SPA elements
  const observer = new MutationObserver((mutations) => {
    // Ignore mutations triggered only by our own style tag or collapsed banners
    for (const m of mutations) {
      if (m.target === styleEl) continue;
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

  // Listen for picker activation message
  chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
    if (req && req.action === 'launchElementPicker') {
      if (window.SemanticShieldElementPicker) {
        window.SemanticShieldElementPicker.start();
        sendResponse({ started: true });
      } else {
        sendResponse({ started: false, error: 'Picker module not loaded' });
      }
    }
  });
})();
