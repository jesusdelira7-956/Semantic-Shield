# Chrome Web Store Listing: Semantic Shield

## Listing Metadata
- **Name:** Semantic Shield
- **Summary:** Sovereign ad, tracker, and local firewall shield with AI clutter filtering, live request logger, and self-healing element picker.
- **Category:** Productivity / Privacy & Security
- **Version:** 2.1.0
- **Last Updated:** 2026-11-21

## Detailed Description
Semantic Shield is a sovereign content filtering and browser security extension built for the modern AI era. It protects local AI engines, MCP servers, and Docker containers from browser-originated CSRF/`0.0.0.0`-day probes while guarding browser agents against concealed Indirect Prompt Injections (IPI) and decluttering AI slop.

### Key Capabilities
- **Local Network, 0.0.0.0-Day & MCP Firewall:** Protects local workstations, Docker containers, MCP Inspector (`:6274`), OpenCode (`:49374`), Ollama (`:11434`), `llama.cpp` (`:8080`), vLLM (`:8000`), and LM Studio (`:1234`) by blocking external websites from hitting `127.0.0.0/8`, `0.0.0.0`, `*.localhost`, `[::1]`, or `host.docker.internal` via DeclarativeNetRequest.
- **Indirect Prompt Injection (IPI) & WebMCP Guard:** Detects hidden prompt-hijacking directives embedded in HTML comments, `font-size: 0`, `opacity: 0`, off-screen CSS, or camouflaged elements, and inspects `navigator.modelContext` (WebMCP) tool exposure.
- **Upgraded Tracker & Telemetry Shield + Dynamic Filter Editor ("My Filters"):** 65+ curated ad/session-replay/telemetry rules plus custom DNR network (`@@` allowlists + multi-type options) and CSS selector compilation.
- **Smart Generative AI Clutter Filter & Domain-Scoped Self-Healing Picker:** Hides Google AI Overviews, Grok, and Rufus, and stores hostname-scoped multi-point element signatures.
- **Chrome Built-in AI (Gemini Nano) Optional Verifier:** Feature-detects local Gemini Nano `LanguageModel` availability for offline snippet verification when hardware supports it.

### Support Development
If this extension keeps your local AI secure or saves you development headaches, consider fueling further updates with a coffee:
https://buymeacoffee.com/JesseInTheLab

## Permissions Justification (Store Build — Least Privilege)
- `declarativeNetRequest`: Blocks ad, tracker, and third-party loopback (`127.0.0.1` / `localhost`) requests via static and user-compiled dynamic rules, without reading page content. Also powers the per-tab blocked-request badge counter.
- `storage`: Saves custom filters, toggle states, and picked-element rules locally (`chrome.storage.local`) and mirrors the user's filter list to their own Chrome Sync (`chrome.storage.sync`).
- `sidePanel`: Opens the filter editor, logger, and settings dashboard in Chrome's side panel when the user clicks "Open Dashboard".
- Content script on all sites (`content_scripts.matches: <all_urls>`): Applies the user's cosmetic filters, hides generative-AI widgets, and runs the element picker on whatever site the user visits. No page data leaves the browser.

> `declarativeNetRequestFeedback` is used only in developer (unpacked) mode for the per-request live logger and is stripped from the store package. `tabs`, `scripting`, `activeTab`, and `host_permissions` were removed in v2.0.1 because no shipped code requires them.

## Notes for Reviewers
- All network blocking uses `declarativeNetRequest` `block` rules only (no redirect / header modification), so no host permissions are requested.
- Quick test: open any site, open DevTools Console, run `fetch('http://127.0.0.1:11434/api/tags')` → `net::ERR_BLOCKED_BY_CLIENT`; the toolbar badge increments.
- Permission usage is enforced by `audit_permissions.py`, which fails the build if any declared permission is not invoked in code.

## Privacy & Data Use
- **Zero Data Collection:** This extension does not collect, transmit, or monetize any user data, browsing history, or personal information.
- **Local-Only Processing:** All rule compilation, element analysis, and logging occur strictly inside your local browser instance.

## Version History
- **v2.1.0 (2026-11-21):** Added `0.0.0.0`-Day (`CVE-2025-49596` class), full `127.0.0.0/8`, and `host.docker.internal` DNR rules; Indirect Prompt Injection (IPI) hidden-text detector & WebMCP inspector; master DNR toggle sync; domain-scoped self-healing rules; XSS-safe sidepanel DOM; Chrome Built-in AI (`LanguageModel`) optional verifier; and 68 curated static tracker/telemetry rules.
- **v2.0.2 (2026-11-10):** Enhanced Workstation Perimeter UI with zero-config Docker container defense and expanded port matrix (Ollama :11434, llama.cpp :8080, vLLM :8000, LM Studio :1234, Open WebUI :8081).
- **v2.0.1 (2026-11-09):** Least-privilege hardening (removed unused `tabs`, `scripting`, `activeTab`, and `<all_urls>` host permission; native DNR badge counter in store builds; automated permission audit gate) and classic-script fix for the content script heuristics engine.
- **v2.0.0 (2026-11-08):** Initial sovereign release with Manifest V3 dynamic rule compiler, live logger side panel, GenAI clutter filter, self-healing element picker, and local LLM loopback firewall.
