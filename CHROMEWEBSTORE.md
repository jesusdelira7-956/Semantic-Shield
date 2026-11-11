# Chrome Web Store Listing: Semantic Shield

## Listing Metadata
- **Name:** Semantic Shield
- **Summary:** Sovereign ad, tracker, and local firewall shield with AI clutter filtering, live request logger, and self-healing element picker.
- **Category:** Productivity / Privacy & Security
- **Version:** 2.0.2
- **Last Updated:** 2026-11-10

## Detailed Description
Semantic Shield is a sovereign content filtering and privacy extension built for the modern web. It blocks intrusive advertisements, telemetry trackers, and local loopback probes while giving you intelligent tools to clean up generative AI clutter.

### Key Capabilities
- **Local Network Firewall:** Protects local workstations, Docker containers, and AI engines (Ollama, llama.cpp, vLLM, LM Studio) by blocking third-party websites from making unauthorized background requests to loopback ports (`127.0.0.1` and `localhost`).
- **Dynamic Filter Editor ("My Filters"):** Write and compile custom network and cosmetic filtering rules with live updates.
- **Live Blocked Request Logger:** Inspect blocked network requests in real time via an interactive side panel.
- **Smart Generative AI Clutter Filter:** One-click toggles to remove search engine AI summaries, sidebar AI chatbots, and synthetic promotional blocks.
- **Self-Healing Element Picker:** Interactively click and suppress unwanted page elements using multi-point structural signatures that survive randomized class changes.

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
- **v2.0.2 (2026-11-10):** Enhanced Workstation Perimeter UI with zero-config Docker container defense and expanded port matrix (Ollama :11434, llama.cpp :8080, vLLM :8000, LM Studio :1234, Open WebUI :8081).
- **v2.0.1 (2026-11-09):** Least-privilege hardening (removed unused `tabs`, `scripting`, `activeTab`, and `<all_urls>` host permission; native DNR badge counter in store builds; automated permission audit gate) and classic-script fix for the content script heuristics engine.
- **v2.0.0 (2026-11-08):** Initial sovereign release with Manifest V3 dynamic rule compiler, live logger side panel, GenAI clutter filter, self-healing element picker, and local LLM loopback firewall.
