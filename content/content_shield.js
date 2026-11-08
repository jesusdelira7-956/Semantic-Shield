/**
 * Antigravity Semantic Shield - Content Shield Script
 * Enforces cosmetic hiding, GenAI widget blocking, self-healing semantic suppression,
 * and AI sludge collapsing with high-performance requestAnimationFrame batching.
 */

(async function () {
  'use strict';

  // State
  let config = {
    shieldActive: true,
    blockGenAI: true,
    collapseSludge: true,
    cosmeticRules: [],
    semanticRules: [],
  };

  // Load config
  try {
    const stored = await chrome.storage.local.get([
      'shieldActive',
      'blockGenAI',
      'collapseSludge',
      'cosmeticRules',
      'semanticRules',
    ]);
    config = { ...config, ...stored };
  } catch (e) {
    // Fallback defaults
  }

  // Listen for setting changes
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
  styleEl.id = 'antigravity-semantic-shield-style';
  document.documentElement.appendChild(styleEl);

  function updateDynamicStyles() {
    if (!config.shieldActive) {
      styleEl.textContent = '';
      return;
    }

    const currentHost = window.location.hostname;
    const selectors = [];

    // 1. Generic & Domain Cosmetic Rules
    for (const rule of config.cosmeticRules || []) {
      if (rule.domain === '*' || currentHost.includes(rule.domain)) {
        selectors.push(rule.selector);
      }
    }

    // 2. Built-in GenAI Widget Selectors
    if (config.blockGenAI) {
      const GENAI_SELECTORS = [
        // Google Search AI Overviews
        'div[data-attrid*="wa:/g/"]',
        'div[aria-label*="AI Overview"]',
        'div.YzSd2e',
        // YouTube Ask AI
        'ytd-button-renderer:has(button[aria-label*="Ask"])',
        'ytd-button-renderer:has(yt-icon[icon="sparkles"])',
        // X/Twitter Grok
        'a[data-testid="AppTabBar_Grok_Link"]',
        'div[data-testid="GrokDrawer"]',
        // Amazon Rufus
        '#cr-rufus-desktop-container',
        'div[data-component-type="s-ai-search-summary"]',
        // LinkedIn AI Prompts
        'div:has(> svg[data-test-icon="ai-sparkle"])',
        'button:has(svg[data-test-icon="ai-sparkle"])',
      ];
      selectors.push(...GENAI_SELECTORS);
    }

    if (selectors.length > 0) {
      styleEl.textContent = `${selectors.join(', ')} { display: none !important; opacity: 0 !important; pointer-events: none !important; }`;
    } else {
      styleEl.textContent = '';
    }
  }

  updateDynamicStyles();

  // Self-Healing & AI Sludge DOM Scan (Batched with requestAnimationFrame)
  let scanScheduled = false;

  function scheduleDOMClean() {
    if (scanScheduled || !config.shieldActive) return;
    scanScheduled = true;
    requestAnimationFrame(() => {
      runDOMPass();
      scanScheduled = false;
    });
  }

  function runDOMPass() {
    updateDynamicStyles();

    // 1. Apply Self-Healing Semantic Signatures
    if (config.semanticRules && config.semanticRules.length > 0) {
      const allElements = document.querySelectorAll('div, section, article, aside, span, p');
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        if (el.dataset.agShieldSuppressed) continue;

        for (const sig of config.semanticRules) {
          if (window.SemanticHeuristics && window.SemanticHeuristics.matchesSignature(el, sig)) {
            el.style.display = 'none';
            el.dataset.agShieldSuppressed = 'true';
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
        if (el.dataset.agSludgeChecked) continue;
        el.dataset.agSludgeChecked = 'true';

        const text = el.innerText || '';
        if (text.length > 200 && window.SemanticHeuristics) {
          const evalRes = window.SemanticHeuristics.evaluateSludgeScore(text);
          if (evalRes.isSludge) {
            collapseSludgeElement(el, evalRes.hits);
          }
        }
      }
    }
  }

  function collapseSludgeElement(el, hits) {
    if (el.dataset.agSludgeCollapsed) return;
    el.dataset.agSludgeCollapsed = 'true';

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
    banner.innerHTML = `
      <span>⚡ <strong>Synthetic/AI Content Collapsed</strong> (${hits} formulaic patterns detected)</span>
      <span style="color: #38bdf8; text-decoration: underline;">Click to reveal</span>
    `;

    banner.addEventListener('click', () => {
      el.style.display = originalDisplay;
      banner.remove();
    });

    el.parentNode.insertBefore(banner, el);
  }

  // MutationObserver to clean dynamic SPA elements
  const observer = new MutationObserver(() => {
    scheduleDOMClean();
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
    scheduleDOMClean();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true });
      scheduleDOMClean();
    });
  }

  // Listen for picker activation message
  chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.action === 'launchElementPicker') {
      if (window.AntigravityElementPicker) {
        window.AntigravityElementPicker.start();
        sendResponse({ started: true });
      } else {
        sendResponse({ started: false, error: 'Picker module not loaded' });
      }
    }
  });
})();
