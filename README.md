# 🛡️ Semantic Shield (v2.0)

> **The Sovereign AI-Era Browser Firewall & Noise Filter.**  
> Built for the post-AI era: Combines core ad & tracker blocking, an interactive loopback firewall for Local LLMs, real-time live request logging, and semantic filtering for generative AI clutter.

[![Download Latest ZIP](https://img.shields.io/badge/⬇️_Download_Extension_ZIP-v2.0.0-00e5ff?style=for-the-badge)](https://github.com/jesusdelira7-956/Semantic-Shield/releases/latest/download/Semantic-Shield-v2.0.0.zip)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Manifest: V3](https://img.shields.io/badge/Manifest-V3-success.svg?style=for-the-badge)](manifest.json)

---

## 🚨 The Unspoken Crisis: Your Web Browser is a Backdoor into Your Local AI

If you run local AI models—whether using **Ollama (`:11434`)**, **`llama.cpp` / `llama-server` (`:8080`)**, **LM Studio (`:1234`)**, **vLLM**, or **Open WebUI (`:8081`)**—you probably believe you are operating in complete privacy and isolation because your servers bind to `127.0.0.1`.

**You are not.**

Here is the dirty reality of modern web architecture: **`127.0.0.1` prevents connections from the outside internet, but it does NOT protect against code running inside your own browser.**

Every time you visit a website, click an external link, or browse a page with third-party tracking scripts, JavaScript executes inside your browser. That JavaScript has direct network access to your machine's loopback interface.

### What an untrusted website can do while you browse:
1. **VRAM Exhaustion & GPU Starvation (Local DoS):** A hidden background script can fire continuous automated `fetch('http://127.0.0.1:11434/api/generate')` loops, forcing your GPU to peg at 100% compute, draining critical VRAM headroom, and freezing your system.
2. **Model Manipulation & State Tampering:** In unauthenticated local backends, simple background `POST` requests can quietly trigger model downloads, alter templates, or delete weights.
3. **Data Exfiltration via Local RAG:** If you have connected your personal notes, files, or codebases to an unauthenticated local AI tool, malicious web scripts can prompt your model to summarize your private local documents and exfiltrate the answers back to an attacker-controlled server.
4. **DNS Rebinding Bypasses:** Attackers use rapid-TTL DNS records to disguise `127.0.0.1` as their own domain, completely evading browser Same-Origin Policy (SOP).

---

## 🛑 The Problem with Other Blockers

Modern browser standards and conventional ad blockers leave massive gaps:
* ❌ **Zero Localhost Defense:** Traditional blockers only look outward at external ad domains—they have zero rules protecting loopback ports (`127.0.0.1`, `localhost`).
* ❌ **Missing Power-User Tools:** In other blockers, live network request loggers and custom rule editors have been stripped down, restricted, or removed.
* ❌ **Blind to AI Clutter:** Standard filters do not address search engine AI Overviews, platform chatbots (Grok, Rufus, Ask AI), or synthetic SEO text blocks.

---

## ⚡ The Solution: Semantic Shield

**Semantic Shield is the first dual-directional browser firewall engineered specifically for the post-AI era.**

It doesn't just block ads. It acts as an active security perimeter between the chaotic public internet and your local machine, while restoring the power-user tools that modern browser transitions stripped away.

```text
       [ Public Internet & Ad Networks ]
                       │
                       ▼
    ╔════════════════════════════════════════╗
    ║          SEMANTIC SHIELD (MV3)         ║
    ║  • Loopback Firewall (Blocks -> 127.x) ║
    ║  • Live MV3 Rule Compiler (My Filters) ║
    ║  • Real-Time Network Request Logger    ║
    ║  • 1-Click GenAI Clutter Stripper      ║
    ║  • AI-Sludge Semantic Text Collapser   ║
    ║  • Self-Healing 3-Point Element Picker ║
    ╚════════════════════════════════════════╝
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
  [ Clean Webpage ]       [ 🔒 Local LLM Engines ]
                           (:8080 / :11434 / :8890)
                           Protected from Browser CSRF!
```

---

## 💎 The 6 Core Capabilities

### 1. Pre-Compiled Local LLM Loopback Firewall (Zero VRAM Risk)
* **What it does:** Out-of-the-box declarative rules block external sites from sending `fetch`, `XHR`, `WebSocket`, or `sub_frame` requests to `127.0.0.1`, `localhost`, and `[::1]`.
* **Smart Local Exemption:** Legitimate local dashboards (like Open WebUI on `http://localhost:8081` or App Hub on `http://localhost:8890`) remain fully functional.

### 2. Restored Dynamic "My Filters" Compiler
* In our Side Panel, you can write standard adblock filter syntax (`||domain^$domain=...`, `domain##selector`). Our background engine compiles them **live** into native dynamic rules (supporting up to 30,000 live rules) without restarting your browser.

### 3. Real-Time Network Request Logger
* Inspect blocked traffic on the fly via a streaming diagnostic console via `declarativeNetRequestFeedback`. View timestamps, request types, destination URLs, triggered rule IDs, and initiating domains in real time.

### 4. 1-Click GenAI Clutter Shield
* Remove unsolicited AI clutter across major platforms with simple toggles:
  * Search engine **AI Overviews** (restoring organic results).
  * Video platform **Ask AI** widgets and summaries.
  * Social media **Grok** sidebars and prompts.
  * E-commerce **Rufus** review summaries.

### 5. Semantic AI-Sludge Collapser ("SponsorBlock for Text")
* A client-side linguistic scanner identifies formulaic synthetic filler (*"In today's fast-paced digital landscape..."*, *"delve into the nuances..."*, *"it is crucial to remember that..."*) and collapses it behind an unobtrusive bar:
  > `[⚡ Synthetic/AI Content Collapsed (4 patterns detected) — Click to Reveal]`

### 6. Self-Healing Visual Element Picker
* Traditional cosmetic rules break when websites randomize CSS class names (`.css-1x8f9a`). The Semantic Shield picker captures a **3-point signature** (ARIA roles, DOM structural hierarchy, and text anchor fingerprints) so rules heal themselves across site redesigns.

---

## 📊 Comparison Matrix

| Capability | Other Blockers | **Semantic Shield (v2.0)** |
| :--- | :---: | :---: |
| **Local LLM Loopback Protection** | ❌ None | **✅ Built-In Pre-Compiled Firewall** |
| **Manifest V3 Native & Future-Proof** | ⚠️ Restricted | **✅ Yes (Modular ES Worker)** |
| **"My Filters" Live Dynamic Compiler** | ❌ Stripped Out | **✅ Restored (30,000 Dynamic Rules)** |
| **Live Blocked Request Logger** | ❌ Stripped Out | **✅ Restored (Live Streaming Side Panel)** |
| **GenAI Widget Stripper** | ⚠️ Manual community lists | **✅ 1-Click Native Toggles** |
| **Semantic AI-Sludge Collapser** | ❌ None | **✅ Built-in Linguistic Scanner** |
| **Self-Healing DOM Element Picker** | ❌ Breaks on randomized CSS | **✅ 3-Point Semantic Signatures** |
| **1-Click Diagnostic Export for Support**| ❌ None | **✅ 1-Click Anonymized JSON Snapshot** |

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
│   ├── filter_compiler.js     # Live compiler converting standard filter syntax to MV3 rules
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
