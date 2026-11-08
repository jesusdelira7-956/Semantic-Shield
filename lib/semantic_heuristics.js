/**
 * Semantic Shield - Semantic Heuristics & Self-Healing Engine
 */

export const GENAI_WIDGET_CATALOG = [
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
      'ytd-clarification-renderer:has(yt-formatted-string:contains("AI"))',
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
      'aside:has(span:contains("Grok"))',
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

export const AI_SLUDGE_PATTERNS = [
  /\bin today's (?:fast-paced|ever-evolving|digital) (?:world|landscape|age)\b/i,
  /\bdelve into the (?:complexities|nuances|world of)\b/i,
  /\bis a testament to the\b/i,
  /\bit is crucial to remember that\b/i,
  /\bin conclusion, (?:whether you're|it is clear that)\b/i,
  /\blook no further than\b/i,
  /\bgame-changer in the realm of\b/i,
];

export class SemanticHeuristics {
  /**
   * Generates a resilient 3-point semantic signature for an element.
   * Survives randomized CSS class names.
   */
  static generateSignature(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return null;

    // Point 1: Semantic Attributes
    const semanticAttrs = {};
    const candidateAttrs = ['role', 'aria-label', 'data-testid', 'data-component', 'data-attrid', 'itemprop'];
    for (const attr of candidateAttrs) {
      if (el.hasAttribute(attr)) {
        semanticAttrs[attr] = el.getAttribute(attr);
      }
    }

    // Point 2: Structural Tree Fingerprint
    const tag = el.tagName.toLowerCase();
    const parentTag = el.parentElement ? el.parentElement.tagName.toLowerCase() : 'body';
    const childTags = Array.from(el.children).slice(0, 3).map(c => c.tagName.toLowerCase()).join('>');
    const structure = `${parentTag} > ${tag} > ${childTags}`;

    // Point 3: Text & Anchor Fingerprint
    const rawText = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
    const textSnippet = rawText.slice(0, 60);

    return {
      tagName: tag,
      semanticAttrs,
      structure,
      textSnippet,
      created: Date.now(),
    };
  }

  /**
   * Evaluates if a given DOM element matches a saved signature, even if classes changed.
   */
  static matchesSignature(el, sig) {
    if (!el || !sig) return false;
    if (el.tagName.toLowerCase() !== sig.tagName) return false;

    // Check semantic attributes match
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

    // Check text snippet match
    if (sig.textSnippet && sig.textSnippet.length > 15) {
      const text = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
      if (text.startsWith(sig.textSnippet) || text.includes(sig.textSnippet)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Checks if a block of text exhibits robotic AI-sludge indicators.
   */
  static evaluateSludgeScore(text) {
    if (!text || text.length < 150) return { isSludge: false, score: 0 };
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
}

// Expose globally for classic content script contexts
if (typeof window !== 'undefined') {
  window.SemanticHeuristics = SemanticHeuristics;
  window.GENAI_WIDGET_CATALOG = GENAI_WIDGET_CATALOG;
  window.AI_SLUDGE_PATTERNS = AI_SLUDGE_PATTERNS;
}
