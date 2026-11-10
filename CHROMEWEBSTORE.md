# Chrome Web Store Listing: Semantic Shield

## Listing Metadata
- **Name:** Semantic Shield
- **Summary:** Sovereign ad, tracker, and local firewall shield with AI clutter filtering, live request logger, and self-healing element picker.
- **Category:** Productivity / Privacy & Security
- **Version:** 2.0.1
- **Last Updated:** 2026-11-08

## Detailed Description
Semantic Shield is a sovereign content filtering and privacy extension built for the modern web. It blocks intrusive advertisements, telemetry trackers, and local loopback probes while giving you intelligent tools to clean up generative AI clutter.

### Key Capabilities
- **Local Network Firewall:** Protects local workstations and AI engines by blocking third-party websites from making background requests to local loopback ports (`127.0.0.1` and `localhost`).
- **Dynamic Filter Editor ("My Filters"):** Write and compile custom network and cosmetic filtering rules with live updates.
- **Live Blocked Request Logger:** Inspect blocked network requests in real time via an interactive side panel.
- **Smart Generative AI Clutter Filter:** One-click toggles to remove search engine AI summaries, sidebar AI chatbots, and synthetic promotional blocks.
- **Self-Healing Element Picker:** Interactively click and suppress unwanted page elements using multi-point structural signatures that survive randomized class changes.

## Permissions Justification
- `declarativeNetRequest`: Blocks ad and tracking network requests before they fire, without reading your browsing content.
- `declarativeNetRequestFeedback`: Streams real-time blocked request information to your personal live logger dashboard.
- `storage`: Saves your custom filters, toggle states, and element rules securely on your local computer.
- `sidePanel`: Displays your power-user dashboard and live request stream in Chrome's side panel.
- `activeTab`: Grants temporary access to highlight and pick elements on the current webpage when clicked.
- `<all_urls>` (Host Permission): Enables network rule blocking and element suppression across web pages you navigate to.

## Privacy & Data Use
- **Zero Data Collection:** This extension does not collect, transmit, or monetize any user data, browsing history, or personal information.
- **Local-Only Processing:** All rule compilation, element analysis, and logging occur strictly inside your local browser instance.

## Version History
- **v2.0.1 (2026-11-08):** Maintenance release ensuring full classic script conformance in content script heuristics engine.
- **v2.0.0 (2026-11-08):** Initial sovereign release with Manifest V3 dynamic rule compiler, live logger side panel, GenAI clutter filter, self-healing element picker, and local LLM loopback firewall.
