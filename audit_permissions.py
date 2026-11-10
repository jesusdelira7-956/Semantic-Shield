#!/usr/bin/env python3
"""
audit_permissions.py
====================
Least-privilege gate for Chrome Web Store submissions.

Enforces the CWS "Use of Permissions" policy
(https://developer.chrome.com/docs/webstore/program-policies/policies#use_of_permissions)
and pre-empts the "Purple Potassium" excessive-permission rejection
(https://developer.chrome.com/docs/webstore/troubleshooting/#excessive-permissions)
by statically verifying that EVERY permission and host permission declared in
manifest.json is backed by an actual API call in the shipped JavaScript.

Usage:
    python3 audit_permissions.py                 # audit ./manifest.json
    python3 audit_permissions.py --store         # audit as the CWS build (dev-only perms stripped)
    python3 audit_permissions.py --manifest-json '<json>'   # audit an in-memory manifest

Exit code 0 = compliant, 1 = violations found.
"""

import argparse
import json
import re
import sys
from pathlib import Path

EXT_DIR = Path(__file__).resolve().parent
EXCLUDE_DIRS = {".git", ".github", "dist", "_metadata", "node_modules", "__pycache__"}

# Permissions only used in unpacked/developer mode; stripped by package_cws.py.
DEV_ONLY_PERMISSIONS = {"declarativeNetRequestFeedback"}

# permission -> regexes; at least one must match the shipped JS for the permission to be "used".
PERMISSION_USAGE = {
    "storage": [r"chrome\.storage\."],
    "sidePanel": [r"chrome\.sidePanel\."],
    "declarativeNetRequest": [r"chrome\.declarativeNetRequest\.(?!onRuleMatchedDebug)"],
    "declarativeNetRequestWithHostAccess": [r"chrome\.declarativeNetRequest\."],
    "declarativeNetRequestFeedback": [r"onRuleMatchedDebug", r"getMatchedRules"],
    "scripting": [r"chrome\.scripting\."],
    # `tabs` is only required for sensitive Tab fields (url/title/favIconUrl/pendingUrl)
    # or URL-filtered queries. tabs.create/query/sendMessage need NO permission.
    "tabs": [r"\btabs?\.(?:url|title|favIconUrl|pendingUrl)\b", r"tabs\.query\(\s*\{[^}]*\burl\s*:"],
    # activeTab only grants value when paired with an API that needs host access on the active tab.
    "activeTab": [r"chrome\.scripting\.", r"chrome\.tabs\.captureVisibleTab", r"chrome\.pageCapture\."],
    "contextMenus": [r"chrome\.contextMenus\."],
    "alarms": [r"chrome\.alarms\."],
    "notifications": [r"chrome\.notifications\."],
    "cookies": [r"chrome\.cookies\."],
    "webRequest": [r"chrome\.webRequest\."],
    "webNavigation": [r"chrome\.webNavigation\."],
    "downloads": [r"chrome\.downloads\."],
    "history": [r"chrome\.history\."],
    "bookmarks": [r"chrome\.bookmarks\."],
    "identity": [r"chrome\.identity\."],
    "offscreen": [r"chrome\.offscreen\."],
    "unlimitedStorage": [r"chrome\.storage\.local\."],
}

# Host permissions are needed only for these capabilities. Static content_scripts
# get host access from their own `matches`, and DNR block/allow/upgradeScheme rules
# need NO host permission.
HOST_PERMISSION_USAGE = [
    r"chrome\.scripting\.",
    r"chrome\.cookies\.",
    r"chrome\.webRequest\.",
    r"chrome\.tabs\.captureVisibleTab",
    r"\bfetch\(\s*['\"`]https?://",
    r"new\s+XMLHttpRequest",
]
HOST_REQUIRING_DNR_ACTIONS = {"redirect", "modifyHeaders"}


def load_js_sources():
    sources = {}
    for path in EXT_DIR.rglob("*.js"):
        if any(part in EXCLUDE_DIRS for part in path.relative_to(EXT_DIR).parts):
            continue
        sources[str(path.relative_to(EXT_DIR))] = path.read_text(encoding="utf-8")
    return sources


def strip_comments(js):
    js = re.sub(r"/\*.*?\*/", "", js, flags=re.S)
    return re.sub(r"(?m)^\s*//.*$", "", js)


def find_usage(patterns, sources):
    hits = []
    for name, code in sources.items():
        for pat in patterns:
            if re.search(pat, code):
                hits.append(name)
                break
    return hits


def dnr_rule_actions(manifest):
    actions = set()
    for res in manifest.get("declarative_net_request", {}).get("rule_resources", []):
        rule_path = EXT_DIR / res["path"]
        if rule_path.is_file():
            for rule in json.loads(rule_path.read_text(encoding="utf-8")):
                actions.add(rule.get("action", {}).get("type"))
    return actions


def audit(manifest, store_mode=False):
    sources = {k: strip_comments(v) for k, v in load_js_sources().items()}
    violations, report = [], []

    perms = list(manifest.get("permissions", []))
    if store_mode:
        perms = [p for p in perms if p not in DEV_ONLY_PERMISSIONS]

    for perm in perms:
        if perm == "declarativeNetRequest" and manifest.get("declarative_net_request"):
            report.append(f"  [OK]   {perm:<32} static rulesets in manifest")
            continue
        patterns = PERMISSION_USAGE.get(perm)
        if patterns is None:
            violations.append(f"{perm}: no usage rule defined - add a mapping or remove the permission")
            continue
        hits = find_usage(patterns, sources)
        if hits:
            report.append(f"  [OK]   {perm:<32} used in {', '.join(sorted(set(hits)))}")
        else:
            violations.append(f"{perm}: declared but never used (Purple Potassium risk)")

    host_perms = manifest.get("host_permissions", [])
    if host_perms:
        hits = find_usage(HOST_PERMISSION_USAGE, sources)
        needs_dnr_host = bool(dnr_rule_actions(manifest) & HOST_REQUIRING_DNR_ACTIONS)
        if hits or needs_dnr_host:
            reason = ", ".join(hits) if hits else "DNR redirect/modifyHeaders rules"
            report.append(f"  [OK]   host_permissions {host_perms} used by {reason}")
        else:
            violations.append(
                f"host_permissions {host_perms}: not required (content_scripts self-grant via "
                f"`matches`; DNR block rules need no host access)"
            )

    for opt in manifest.get("optional_permissions", []):
        report.append(f"  [INFO] optional permission {opt} (requested at runtime)")

    return violations, report


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--store", action="store_true", help="audit as the Chrome Web Store build")
    parser.add_argument("--manifest-json", help="audit an in-memory manifest JSON string")
    args = parser.parse_args()

    if args.manifest_json:
        manifest = json.loads(args.manifest_json)
    else:
        manifest = json.loads((EXT_DIR / "manifest.json").read_text(encoding="utf-8"))

    mode = "STORE" if args.store or args.manifest_json else "DEV"
    violations, report = audit(manifest, store_mode=(mode == "STORE"))

    print(f"=== Least-Privilege Permission Audit ({mode} build) ===")
    print("\n".join(report))
    if violations:
        print("\n[FAIL] Permission policy violations:")
        for v in violations:
            print(f"  - {v}")
        return 1
    print("\n[PASS] Every declared permission is backed by shipped code.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
