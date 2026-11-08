/**
 * Antigravity Semantic Shield - Live MV3 Filter Compiler
 * Compiles standard adblock & cosmetic filter syntax into:
 * 1. DeclarativeNetRequest dynamic rules (for network blocking)
 * 2. Cosmetic CSS selector rules (for on-page element suppression)
 */

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
    const lines = rawText.split('\n');
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
          const [domainPart, selector] = line.split('##');
          if (selector && selector.trim()) {
            cosmeticRules.push({
              domain: domainPart.trim() || '*',
              selector: selector.trim(),
            });
          }
          continue;
        }

        // 2. Network Filter: e.g. ||127.0.0.1^$domain=~127.0.0.1|~localhost
        let urlPattern = line;
        let optionsStr = '';

        if (line.includes('$')) {
          const parts = line.split('$');
          urlPattern = parts[0].trim();
          optionsStr = parts[1] ? parts[1].trim() : '';
        }

        const rule = {
          id: currentId++,
          priority: 8,
          action: { type: 'block' },
          condition: {
            urlFilter: urlPattern,
            resourceTypes: [
              'xmlhttprequest',
              'script',
              'sub_frame',
              'websocket',
              'webtransport',
              'ping',
              'image',
              'other',
            ],
          },
        };

        if (optionsStr) {
          const opts = optionsStr.split(',');
          for (const opt of opts) {
            const cleanOpt = opt.trim();
            if (cleanOpt.startsWith('domain=')) {
              const domList = cleanOpt.substring('domain='.length).split('|');
              const included = [];
              const excluded = [];
              for (const d of domList) {
                const trimmed = d.trim();
                if (trimmed.startsWith('~')) {
                  excluded.push(trimmed.substring(1));
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
              rule.priority = 20;
            } else if (['script', 'image', 'xmlhttprequest', 'sub_frame', 'ping', 'stylesheet'].includes(cleanOpt)) {
              rule.condition.resourceTypes = [cleanOpt];
            }
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
