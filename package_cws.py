#!/usr/bin/env python3
"""
package_cws.py
==============
Packages Semantic Shield into a clean, compliant ZIP file
ready for direct upload to the Google Chrome Web Store Developer Dashboard.

Excludes:
- .git / .github
- test_extension.py / package_cws.py
- .gitignore / README.md / CHROMEWEBSTORE.md
- dist/ and local caches
"""

import os
import json
import zipfile
from pathlib import Path

EXT_DIR = Path(__file__).resolve().parent
DIST_DIR = EXT_DIR / "dist"
DIST_DIR.mkdir(parents=True, exist_ok=True)
CWS_ZIP = DIST_DIR / "semantic-shield-cws-upload.zip"

EXCLUDE_DIRS = {".git", ".github", "__pycache__", "dist", "_metadata"}
EXCLUDE_FILES = {
    "test_extension.py",
    "package_cws.py",
    ".gitignore",
    "README.md",
    "CHROMEWEBSTORE.md",
    "install.sh",
    "install.ps1",
}

def build_package():
    print(f"[*] Packaging Chrome Web Store upload archive...")
    if CWS_ZIP.exists():
        CWS_ZIP.unlink()

    with zipfile.ZipFile(CWS_ZIP, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(EXT_DIR):
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            for file in files:
                if file in EXCLUDE_FILES or file.endswith(".zip") or file.endswith(".pyc"):
                    continue
                file_path = Path(root) / file
                rel_path = file_path.relative_to(EXT_DIR)
                
                # Production Manifest sanitization for Chrome Web Store:
                # Strips dev-only 'declarativeNetRequestFeedback' to prevent CWS policy rejection
                if rel_path == Path("manifest.json"):
                    with open(file_path, "r", encoding="utf-8") as mf:
                        mdata = json.load(mf)
                    if "declarativeNetRequestFeedback" in mdata.get("permissions", []):
                        mdata["permissions"].remove("declarativeNetRequestFeedback")
                    clean_manifest_bytes = json.dumps(mdata, indent=2).encode("utf-8")
                    zipf.writestr("manifest.json", clean_manifest_bytes)
                    print(f"  + manifest.json (CWS-sanitized: stripped dev-only declarativeNetRequestFeedback)")
                    continue

                zipf.write(file_path, arcname=str(rel_path))
                print(f"  + {rel_path}")

    size_kb = round(CWS_ZIP.stat().st_size / 1024, 2)
    print(f"\n[+] Chrome Web Store upload ZIP ready at:")
    print(f"    {CWS_ZIP} ({size_kb} KB)")

if __name__ == "__main__":
    build_package()
