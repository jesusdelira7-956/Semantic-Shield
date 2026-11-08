#!/usr/bin/env bash
# ==============================================================================
# Semantic Shield - 1-Line Automated Installer (Linux & macOS)
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/jesusdelira7-956/Semantic-Shield/main/install.sh | bash
# ==============================================================================

set -euo pipefail

REPO_URL="https://github.com/jesusdelira7-956/Semantic-Shield.git"
ZIP_URL="https://github.com/jesusdelira7-956/Semantic-Shield/archive/refs/heads/main.zip"
INSTALL_DIR="${HOME}/.local/share/semantic-shield"

echo "======================================================================"
echo "  🛡️  SEMANTIC SHIELD - AUTOMATED INSTALLER"
echo "======================================================================"

mkdir -p "$(dirname "${INSTALL_DIR}")"

# 1. Clone or Update the Extension Repository
if command -v git >/dev/null 2>&1; then
    if [ -d "${INSTALL_DIR}/.git" ]; then
        echo "[*] Updating existing installation at ${INSTALL_DIR}..."
        git -C "${INSTALL_DIR}" pull --ff-only origin main
    else
        echo "[*] Cloning Semantic Shield into ${INSTALL_DIR}..."
        rm -rf "${INSTALL_DIR}"
        git clone --depth 1 "${REPO_URL}" "${INSTALL_DIR}"
    fi
else
    echo "[*] Downloading Semantic Shield archive..."
    TMP_ZIP="$(mktemp /tmp/semantic-shield-XXXXXX.zip)"
    curl -fsSL "${ZIP_URL}" -o "${TMP_ZIP}"
    rm -rf "${INSTALL_DIR}"
    mkdir -p "${INSTALL_DIR}"
    unzip -q "${TMP_ZIP}" -d "${INSTALL_DIR}_tmp"
    mv "${INSTALL_DIR}_tmp"/Semantic-Shield-*/* "${INSTALL_DIR}/"
    rm -rf "${INSTALL_DIR}_tmp" "${TMP_ZIP}"
fi

echo "[+] Installed cleanly to: ${INSTALL_DIR}"

# 2. Copy install path to clipboard if xclip / xsel / wl-copy / pbcopy is available
if command -v xclip >/dev/null 2>&1; then
    printf "%s" "${INSTALL_DIR}" | xclip -selection clipboard || true
    echo "[+] Copied installation path to your clipboard!"
elif command -v wl-copy >/dev/null 2>&1; then
    printf "%s" "${INSTALL_DIR}" | wl-copy || true
    echo "[+] Copied installation path to your clipboard!"
elif command -v pbcopy >/dev/null 2>&1; then
    printf "%s" "${INSTALL_DIR}" | pbcopy || true
    echo "[+] Copied installation path to your clipboard!"
fi

# 3. Create a Desktop / CLI Quick-Launcher with the Extension Pre-Loaded
BIN_DIR="${HOME}/.local/bin"
mkdir -p "${BIN_DIR}"
LAUNCHER="${BIN_DIR}/chrome-semantic-shield"

cat << 'EOF' > "${LAUNCHER}"
#!/usr/bin/env bash
EXT_DIR="${HOME}/.local/share/semantic-shield"
for BROWSER in google-chrome google-chrome-stable chromium chromium-browser brave-browser; do
    if command -v "${BROWSER}" >/dev/null 2>&1; then
        exec "${BROWSER}" --load-extension="${EXT_DIR}" "$@"
    fi
done
echo "Could not find a Chromium browser in PATH."
exit 1
EOF
chmod +x "${LAUNCHER}"

# 4. Open Chrome Extensions Page Automatically
echo ""
echo "======================================================================"
echo "  ✅ INSTALLATION READY!"
echo "======================================================================"
echo "  Extension Folder: ${INSTALL_DIR}"
echo "  (This path has been copied to your clipboard)"
echo ""
echo "  Final Step in Chrome (takes 5 seconds):"
echo "    1. Enable 'Developer mode' (top-right toggle)"
echo "    2. Click 'Load unpacked' and press Ctrl+V (Paste) -> Enter!"
echo "======================================================================"

for BROWSER in google-chrome google-chrome-stable chromium chromium-browser brave-browser; do
    if command -v "${BROWSER}" >/dev/null 2>&1; then
        "${BROWSER}" "chrome://extensions/" >/dev/null 2>&1 &
        break
    fi
done
