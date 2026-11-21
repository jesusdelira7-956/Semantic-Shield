/**
 * Semantic Shield - Semantic Heuristics, Indirect Prompt Injection (IPI) Guard & Self-Healing Engine
 * Classic content script (no top-level ES module export/import).
 */

const GENAI_WIDGET_CATALOG = [
  {
    id: "google_ai_overview",
    name: "Google Search AI Overview",
    domain: "google.",
    selectors: [
      'div[data-attrid*="wa:/g/"]',
      'div[aria-label*="AI Overview"]',
      'div.YzSd2e',
      'div[data-sokoban-container]:has(div[aria-label*="AI Overview"])',
      'div#bres:has(div[aria-label*="AI"])',
    ],
  },
  {
    id: "youtube_ask_ai",
    name: "YouTube Ask AI & Summaries",
    domain: "youtube.com",
    selectors: [
      'ytd-button-renderer:has(button[aria-label*="Ask"])',
      'ytd-button-renderer:has(yt-icon[icon="sparkles"])',
      'ytd-clarification-renderer',
    ],
  },
  {
    id: "twitter_grok",
    name: "X/Twitter Grok AI Prompts",
    domain: "x.com",
    selectors: [
      'a[data-testid="AppTabBar_Grok_Link"]',
      'div[data-testid="GrokDrawer"]',
      'button[aria-label*="Grok"]',
      'aside[aria-label*="Grok"]',
    ],
  },
  {
    id: "amazon_rufus",
    name: "Amazon Rufus AI Summary",
    domain: "amazon.",
    selectors: [
      '#cr-rufus-desktop-container',
      'div[data-component-type="s-ai-search-summary"]',
      'div#rufus-ingress-wrapper',
    ],
  },
  {
    id: "linkedin_ai_prompts",
    name: "LinkedIn AI Writing & Responses",
    domain: "linkedin.com",
    selectors: [
      'div:has(> svg[data-test-icon="ai-sparkle"])',
      'button:has(svg[data-test-icon="ai-sparkle"])',
      'div.feed-shared-ai-prompt',
    ],
  },
];

const AI_SLUDGE_PATTERNS = [
  /\bin today's (?:fast-paced|ever-evolving|digital) (?:world|landscape|age)\b/i,
  /\bdelve into the (?:complexities|nuances|world of)\b/i,
  /\bis a testament to the\b/i,
  /\bit is crucial to remember that\b/i,
  /\bin conclusion, (?:whether you're|it is clear that)\b/i,
  /\blook no further than\b/i,
  /\bgame-changer in the realm of\b/i,
];

const IPI_CONTROL_TOKENS = [
  { id: 'chatml_system', re: /<\|im_start\|>\s*system/i },
  { id: 'inst_tag', re: /\[INST\]/ },
  { id: 'system_override_marker', re: /\bBEGIN\s+SYSTEM\s+OVERRIDE\b/i },
];

const IPI_ADVERSARIAL_PATTERNS = [
  { id: 'ignore_previous', re: /\b(?:ignore|disregard|forget)\s+(?:all\s+|any\s+)?(?:previous|prior)\s+instructions?\b/i },
  { id: 'system_prompt_probe', re: /\bsystem\s+prompt\s*:/i },
  { id: 'developer_mode', re: /\byou\s+are\s+now\s+in\s+(?:developer|jailbreak|unrestricted)\s+mode\b/i },
  { id: 'exfiltrate', re: /\bexfiltrate\b/i },
  { id: 'send_cookies', re: /\b(?:send|leak|post|upload)\s+(?:all\s+|the\s+)?(?:cookies?|tokens?|credentials?|secrets?)\b/i },
  { id: 'forward_conversation', re: /\bforward\s+(?:the\s+)?conversation\s+to\b/i },
  { id: 'override_agent_goal', re: /\b(?:new|override)\s+(?:agent\s+)?instructions?\s*:/i },
];

class SemanticHeuristics {
  /**
   * Validates a CSS selector string cleanly so one malformed user selector never breaks the stylesheet.
   */
  static isValidCssSelector(sel) {
    if (!sel || typeof sel !== 'string' || !sel.trim()) return false;
    if (sel.includes(':contains(')) return false;
    try {
      if (typeof CSS !== 'undefined' && typeof CSS.supports === 'function') {
        return CSS.supports(`selector(${sel})`);
      }
    } catch (_) {
      return false;
    }
    return true;
  }

  /**
   * Generates a domain-scoped 3-point semantic signature for an element.
   */
  static generateSignature(el) {
    if (!el || el.nodeType !== 1) return null;

    const semanticAttrs = {};
    const candidateAttrs = ['role', 'aria-label', 'data-testid', 'data-component', 'data-attrid', 'itemprop'];
    for (const attr of candidateAttrs) {
      if (el.hasAttribute(attr)) {
        semanticAttrs[attr] = el.getAttribute(attr);
      }
    }

    const tag = el.tagName.toLowerCase();
    const parentTag = el.parentElement ? el.parentElement.tagName.toLowerCase() : 'body';
    const childTags = Array.from(el.children).slice(0, 3).map(c => c.tagName.toLowerCase()).join('>');
    const structure = `${parentTag} > ${tag} > ${childTags}`;

    const rawText = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
    const textSnippet = rawText.slice(0, 60);

    const hostname =
      typeof window !== 'undefined' && window.location && window.location.hostname
        ? window.location.hostname
        : '';

    return {
      id: `sig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      hostname,
      tagName: tag,
      semanticAttrs,
      structure,
      textSnippet,
      created: Date.now(),
    };
  }

  static matchesHostname(sig, currentHostname = '') {
    if (!sig) return false;
    if (!sig.hostname || !currentHostname) return true;
    return currentHostname === sig.hostname || currentHostname.endsWith(`.${sig.hostname}`);
  }

  static matchesSignature(el, sig, currentHostname = '') {
    if (!el || !sig) return false;
    if (!this.matchesHostname(sig, currentHostname)) return false;
    if (el.tagName.toLowerCase() !== sig.tagName) return false;

    let attrMatchCount = 0;
    const attrKeys = Object.keys(sig.semanticAttrs || {});
    for (const k of attrKeys) {
      if (el.getAttribute(k) === sig.semanticAttrs[k]) {
        attrMatchCount++;
      }
    }
    if (attrKeys.length > 0 && attrMatchCount === attrKeys.length) {
      return true;
    }

    if (sig.textSnippet && sig.textSnippet.length > 15) {
      const text = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
      if (text.startsWith(sig.textSnippet) || text.includes(sig.textSnippet)) {
        return true;
      }
    }

    return false;
  }

  static evaluateSludgeScore(text) {
    if (!text || text.length < 150) return { isSludge: false, hits: 0, score: 0 };
    let hits = 0;
    for (const pat of AI_SLUDGE_PATTERNS) {
      if (pat.test(text)) hits++;
    }
    const score = hits / AI_SLUDGE_PATTERNS.length;
    return {
      isSludge: hits >= 2,
      hits,
      score,
    };
  }

  /**
   * Evaluates Indirect Prompt Injection (IPI) risk.
   * Requires explicit LLM control tokens OR (CSS/comment concealment + adversarial directive)
   * so benign articles discussing prompt injection are NOT false-flagged.
   */
  static evaluateIPIRisk(text, concealmentReasons = []) {
    const cleanText = String(text || '');
    const reasons = Array.isArray(concealmentReasons) ? concealmentReasons.filter(Boolean) : [];
    const matchedPatterns = [];
    let hasControlToken = false;

    for (const entry of IPI_CONTROL_TOKENS) {
      if (entry.re.test(cleanText)) {
        hasControlToken = true;
        matchedPatterns.push(entry.id);
      }
    }

    for (const entry of IPI_ADVERSARIAL_PATTERNS) {
      if (entry.re.test(cleanText)) {
        matchedPatterns.push(entry.id);
      }
    }

    const concealedAndAdversarial = reasons.length > 0 && matchedPatterns.length >= 1;
    const isSuspicious = hasControlToken || concealedAndAdversarial;

    let severity = 'none';
    if (isSuspicious) {
      severity =
        hasControlToken || (reasons.length > 0 && matchedPatterns.length >= 2) ? 'critical' : 'high';
    }

    return {
      isSuspicious,
      severity,
      matchedPatterns,
      reasons,
    };
  }
}

if (typeof window !== 'undefined') {
  window.SemanticHeuristics = SemanticHeuristics;
  window.GENAI_WIDGET_CATALOG = GENAI_WIDGET_CATALOG;
  window.AI_SLUDGE_PATTERNS = AI_SLUDGE_PATTERNS;
  window.IPI_ADVERSARIAL_PATTERNS = IPI_ADVERSARIAL_PATTERNS;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GENAI_WIDGET_CATALOG,
    AI_SLUDGE_PATTERNS,
    IPI_ADVERSARIAL_PATTERNS,
    SemanticHeuristics,
  };
}
