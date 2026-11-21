/**
 * Semantic Shield - Live MV3 Filter Compiler
 * Compiles standard adblock & cosmetic filter syntax into:
 * 1. DeclarativeNetRequest dynamic rules (for network blocking & @@ allowlists)
 * 2. Validated cosmetic CSS selector rules (for on-page element suppression)
 */

const VALID_RESOURCE_TYPES = new Set([
  'script',
  'image',
  'xmlhttprequest',
  'sub_frame',
  'ping',
  'stylesheet',
  'websocket',
  'webtransport',
  'font',
  'media',
  'other',
]);

const DEFAULT_RESOURCE_TYPES = [
  'xmlhttprequest',
  'script',
  'sub_frame',
  'websocket',
  'webtransport',
  'ping',
  'image',
  'other',
];

const ASCII_PRINTABLE_RE = /^[\x20-\x7E]+$/;

export class FilterCompiler {
  constructor(startRuleId = 10000) {
    this.startRuleId = startRuleId;
  }

  /**
   * Compiles raw user filter text into DNR dynamic rules and cosmetic selectors.
   * @param {string} rawText
   * @returns {{ dynamicRules: Array<object>, cosmeticRules: Array<object>, errors: Array<string> }}
   */
  compile(rawText) {
    const lines = String(rawText || '').split('\n');
    const dynamicRules = [];
    const cosmeticRules = [];
    const errors = [];
    let currentId = this.startRuleId;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex].trim();
      if (!line || line.startsWith('!') || line.startsWith('#') || line.startsWith('[')) {
        continue;
      }

      try {
        // 1. Cosmetic Filter: domain##selector or ##selector
        if (line.includes('##')) {
          const splitIdx = line.indexOf('##');
          const domainPart = line.slice(0, splitIdx);
          const selector = line.slice(splitIdx + 2).trim();
          if (!selector) {
            errors.push(`Line ${lineIndex + 1}: Empty cosmetic selector.`);
            continue;
          }
          if (selector.includes(':contains(')) {
            errors.push(
              `Line ${lineIndex + 1}: Non-standard pseudo-selector ':contains()' is unsupported in native CSS; use standard attributes instead.`
            );
            continue;
          }
          cosmeticRules.push({
            domain: domainPart.trim() || '*',
            selector,
          });
          continue;
        }

        // 2. Network Filter: optional @@ allowlist prefix + urlPattern + $options
        let isAllow = false;
        let workingLine = line;
        if (workingLine.startsWith('@@')) {
          isAllow = true;
          workingLine = workingLine.slice(2).trim();
        }

        let urlPattern = workingLine;
        let optionsStr = '';
        const dollarIdx = workingLine.indexOf('$');
        if (dollarIdx !== -1) {
          urlPattern = workingLine.slice(0, dollarIdx).trim();
          optionsStr = workingLine.slice(dollarIdx + 1).trim();
        }

        if (!urlPattern || !ASCII_PRINTABLE_RE.test(urlPattern)) {
          errors.push(`Line ${lineIndex + 1}: Network filter must be non-empty and ASCII-only.`);
          continue;
        }

        const rule = {
          id: currentId++,
          priority: isAllow ? 15 : 8,
          action: { type: isAllow ? 'allow' : 'block' },
          condition: {
            urlFilter: urlPattern,
            resourceTypes: [...DEFAULT_RESOURCE_TYPES],
          },
        };

        if (optionsStr) {
          const selectedTypes = [];
          const opts = optionsStr.split(',');
          for (const opt of opts) {
            const cleanOpt = opt.trim();
            if (!cleanOpt) continue;

            if (cleanOpt.startsWith('domain=')) {
              const domList = cleanOpt.substring('domain='.length).split('|');
              const included = [];
              const excluded = [];
              for (const d of domList) {
                const trimmed = d.trim();
                if (trimmed.startsWith('~')) {
                  if (trimmed.length > 1) excluded.push(trimmed.substring(1));
                } else if (trimmed) {
                  included.push(trimmed);
                }
              }
              if (included.length > 0) {
                rule.condition.initiatorDomains = included;
              }
              if (excluded.length > 0) {
                rule.condition.excludedInitiatorDomains = excluded;
              }
            } else if (cleanOpt === 'important') {
              rule.priority = Math.max(rule.priority, 20);
            } else if (VALID_RESOURCE_TYPES.has(cleanOpt)) {
              if (!selectedTypes.includes(cleanOpt)) {
                selectedTypes.push(cleanOpt);
              }
            }
          }

          if (selectedTypes.length > 0) {
            rule.condition.resourceTypes = selectedTypes;
          }
        }

        dynamicRules.push(rule);
      } catch (err) {
        errors.push(`Line ${lineIndex + 1}: ${err.message}`);
      }
    }

    return { dynamicRules, cosmeticRules, errors };
  }
}
