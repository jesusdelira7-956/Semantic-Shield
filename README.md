# 🛡️ Antigravity Semantic Shield (v2.0)

> Sovereign Chrome Extension (Manifest V3) combining ad & tracker blocking, an interactive loopback firewall for Local LLMs, real-time live request logging, and semantic filtering for generative AI clutter.

[![Download Latest ZIP](https://img.shields.io/badge/⬇️_Download_Extension_ZIP-v2.0.0-00e5ff?style=for-the-badge)](https://github.com/jesusdelira7-956/Semantic-Shield/releases/latest/download/Semantic-Shield-v2.0.0.zip)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Manifest: V3](https://img.shields.io/badge/Manifest-V3-success.svg?style=for-the-badge)](manifest.json)

---

## 🚀 3 Easy Ways to Install in Chrome

### Method 1: Drag & Drop ZIP (Fastest — No Unzipping or Terminal Needed!)
1. **[👉 Click Here to Download `Semantic-Shield-v2.0.0.zip`](https://github.com/jesusdelira7-956/Semantic-Shield/releases/latest/download/Semantic-Shield-v2.0.0.zip)**
2. Open Chrome (or Brave / Edge) and go to **`chrome://extensions/`**
3. Turn ON **Developer mode** (toggle in the top-right corner).
4. **Drag and drop** the downloaded `Semantic-Shield-v2.0.0.zip` file directly from your downloads bar onto the `chrome://extensions/` page! *(Chrome installs root-packaged extension ZIPs automatically without needing to unzip first.)*

---

### Method 2: 1-Line Automated Installer (Auto-Downloads, Copies Path & Opens Chrome)

Paste a single command in your terminal. It installs the extension to a permanent local directory, copies the folder path to your clipboard automatically, and opens `chrome://extensions/` for you:

#### 🐧 Linux & 🍎 macOS:
```bash
curl -fsSL https://raw.githubusercontent.com/jesusdelira7-956/Semantic-Shield/main/install.sh | bash
```

#### 🪟 Windows (PowerShell):
```powershell
irm https://raw.githubusercontent.com/jesusdelira7-956/Semantic-Shield/main/install.ps1 | iex
```
*(Once Chrome opens `chrome://extensions/`, simply click **Load unpacked** and press **`Ctrl+V`** to paste the pre-copied path!)*

---

### Method 3: Standard Git Clone (For Developers)
```bash
git clone https://github.com/jesusdelira7-956/Semantic-Shield.git
```
Then open `chrome://extensions/`, enable **Developer mode**, click **Load unpacked**, and select the cloned `Semantic-Shield` folder.

---

## ⚡ What Makes This Different?

Unlike stripped-down Manifest V3 blockers (such as uBlock Origin Lite), **Antigravity Semantic Shield** restores power-user capabilities and addresses modern AI-era web noise:

1. **Local LLM Loopback Firewall:** Blocks malicious or untrusted websites from silently firing background requests (`fetch`, `XHR`, `WebSocket`, DNS rebinding) to local AI engines (`127.0.0.1` and `localhost` ports `:8080`, `:11434`, `:8088`, `:8890`). Local sovereign dashboards (e.g. Open WebUI, App Hub) remain fully exempt.
2. **Restored "My Filters" Rule Compiler:** Write standard uBlock/AdGuard network rules (`||domain^$domain=...`) and cosmetic selectors directly inside the side panel. Compiles live into Chrome's `declarativeNetRequest.updateDynamicRules` API.
3. **Real-Time Blocked Request Logger:** An interactive live stream of blocked requests showing timestamp, type, URL, and triggered rule ID via `declarativeNetRequestFeedback`.
4. **Smart GenAI Clutter Shield:** 1-click removal of search engine AI summaries (Google AI Overviews), sidebar AI bots (X Grok, YouTube Ask AI), and shopping summaries (Amazon Rufus).
5. **Semantic AI Sludge Collapser:** Automatically identifies formulaic, synthetic SEO filler text and collapses it behind a discreet banner.
6. **Self-Healing Visual Element Picker:** Click and hide annoying elements using 3-point semantic signatures (attributes + DOM structure + text anchors) that survive randomized CSS class changes.

---

## 📦 Directory Structure

```text
├── manifest.json              # Manifest V3 configuration with ES Module service worker
├── background.js              # Background service worker (rule compiler, logger, badge stats)
├── install.sh                 # 1-line automated installer for Linux & macOS
├── install.ps1                # 1-line automated installer for Windows PowerShell
├── icons/                     # Crisp vector-generated PNG icons (16px, 48px, 128px)
├── rules/
│   ├── local_llm_shield.json  # Pre-compiled local loopback firewall rules
│   └── core_ad_shield.json    # Core ad and tracking protection rules
├── lib/
│   ├── filter_compiler.js     # Live compiler converting uBlock syntax to MV3 rules
│   └── semantic_heuristics.js # GenAI widget signatures & self-healing DOM matcher
├── content/
│   ├── content_shield.js      # Cosmetic rule enforcer & AI sludge collapser
│   └── element_picker.js      # Visual element picker with 3-point signature builder
├── popup/                     # Quick-action popup HUD
└── sidepanel/                 # Power-User Dashboard (My Filters, Live Logger, Feedback)
```

---

## 🛠️ Diagnostics & Error Reporting

Encountered an issue or a broken website?
1. Open the extension popup and click **Help & Report Issue** (or open the Chrome Side Panel).
2. Navigate to the **Help & Feedback** tab.
3. Click **Copy Diagnostic Bundle** to copy an anonymized debug snapshot to your clipboard.
4. Click **Open GitHub Issue** and paste your diagnostic bundle.

---

## 📄 License

MIT License. Free and open source for sovereign local AI workflows.
