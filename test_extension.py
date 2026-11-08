#!/usr/bin/env python3
"""
projects/antigravity_semantic_shield/test_extension.py
======================================================
Automated Validation Suite for Semantic Shield v2.0.
Verifies Manifest V3 compliance, icon dimensions, DNR rule syntax, and file completeness.
"""

import json
import sys
from pathlib import Path
from PIL import Image

EXTENSION_DIR = Path(__file__).resolve().parent

def test_manifest():
    manifest_path = EXTENSION_DIR / "manifest.json"
    assert manifest_path.is_file(), "manifest.json missing"
    
    with open(manifest_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    assert data.get("manifest_version") == 3, "Must be Manifest V3"
    assert data.get("name") == "Semantic Shield"
    assert "declarativeNetRequest" in data.get("permissions", [])
    assert "declarativeNetRequestFeedback" in data.get("permissions", [])
    assert "sidePanel" in data.get("permissions", [])
    assert data.get("background", {}).get("service_worker") == "background.js"
    assert data.get("side_panel", {}).get("default_path") == "sidepanel/sidepanel.html"
    print("[+] manifest.json schema & permissions: OK")
    return data

def test_icons(manifest_data):
    icons = manifest_data.get("icons", {})
    for size_str, path_str in icons.items():
        icon_path = EXTENSION_DIR / path_str
        assert icon_path.is_file(), f"Icon file missing: {path_str}"
        with Image.open(icon_path) as img:
            expected_dim = int(size_str)
            assert img.size == (expected_dim, expected_dim), f"Icon {path_str} dimension mismatch: {img.size} vs {expected_dim}"
            print(f"[+] Icon {size_str}x{size_str} ({path_str}): OK")

def test_dnr_rules():
    rule_files = [
        EXTENSION_DIR / "rules" / "local_llm_shield.json",
        EXTENSION_DIR / "rules" / "core_ad_shield.json"
    ]
    all_rule_ids = set()
    
    for rf in rule_files:
        assert rf.is_file(), f"Rule file missing: {rf}"
        with open(rf, "r", encoding="utf-8") as f:
            rules = json.load(f)
            assert isinstance(rules, list), f"{rf.name} must be a JSON array"
            for r in rules:
                rid = r.get("id")
                assert rid is not None, f"Rule missing ID in {rf.name}"
                assert rid not in all_rule_ids, f"Duplicate rule ID {rid} found in {rf.name}"
                all_rule_ids.add(rid)
                assert r.get("action", {}).get("type") in ("block", "allow", "redirect")
                cond = r.get("condition", {})
                assert "urlFilter" in cond or "regexFilter" in cond
        print(f"[+] Ruleset {rf.name} ({len(rules)} rules): OK")

def test_frontend_assets():
    required_files = [
        "background.js",
        "lib/filter_compiler.js",
        "lib/semantic_heuristics.js",
        "content/content_shield.js",
        "content/element_picker.js",
        "popup/popup.html",
        "popup/popup.css",
        "popup/popup.js",
        "sidepanel/sidepanel.html",
        "sidepanel/sidepanel.css",
        "sidepanel/sidepanel.js",
    ]
    for rf in required_files:
        p = EXTENSION_DIR / rf
        assert p.is_file(), f"Required extension asset missing: {rf}"
        assert p.stat().st_size > 0, f"Asset is empty: {rf}"
    print(f"[+] All {len(required_files)} extension assets verified present & non-empty: OK")

def main():
    print("=== Testing Semantic Shield Extension ===")
    manifest = test_manifest()
    test_icons(manifest)
    test_dnr_rules()
    test_frontend_assets()
    print("\n✅ All Manifest V3 Extension Tests Passed Successfully!")

if __name__ == "__main__":
    main()
