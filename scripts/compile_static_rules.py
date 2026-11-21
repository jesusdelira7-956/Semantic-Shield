#!/usr/bin/env python3
"""
scripts/compile_static_rules.py
===============================
Compiles a curated, high-signal MV3 static tracker/ad/telemetry ruleset into
rules/core_ad_shield.json safely within Chrome Web Store DNR static caps.

Usage:
    python3 scripts/compile_static_rules.py                  # generate from curated baseline
    python3 scripts/compile_static_rules.py --fetch-upstream # merge Peter Lowe's list in CI (cap <= 2500)
    python3 scripts/compile_static_rules.py --check          # verify existing rules/core_ad_shield.json
"""

import argparse
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
RULES_FILE = ROOT_DIR / "rules" / "core_ad_shield.json"

MAX_STATIC_RULES = 2500
MIN_RULE_ID = 100
MAX_RULE_ID = 4999
UPSTREAM_URL = "https://pgl.yoyo.org/adservers/serverlist.php?hostformat=nohtml&showintro=0&mimetype=plaintext"
DOMAIN_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$")

# Curated high-signal baseline (ads, session replay, telemetry, AI telemetry, pixel trackers)
CURATED_BASELINE_DOMAINS = [
    ("doubleclick.net", ["script", "image", "xmlhttprequest", "sub_frame"]),
    ("googlesyndication.com", ["script", "image", "xmlhttprequest", "sub_frame"]),
    ("google-analytics.com", ["script", "xmlhttprequest", "ping"]),
    ("googletagmanager.com", ["script"]),
    ("adnxs.com", ["script", "image", "xmlhttprequest", "sub_frame"]),
    ("criteo.com", ["script", "image", "xmlhttprequest", "sub_frame"]),
    ("amazon-adsystem.com", ["script", "image", "xmlhttprequest", "sub_frame"]),
    ("taboola.com", ["script", "image", "xmlhttprequest", "sub_frame"]),
    ("outbrain.com", ["script", "image", "xmlhttprequest", "sub_frame"]),
    ("scorecardresearch.com", ["script", "image", "xmlhttprequest", "sub_frame"]),
    ("hotjar.com", ["script", "xmlhttprequest"]),
    ("clarity.ms", ["script", "xmlhttprequest"]),
    ("fullstory.com", ["script", "xmlhttprequest"]),
    ("logrocket.io", ["script", "xmlhttprequest"]),
    ("lr-ingest.io", ["xmlhttprequest", "ping"]),
    ("mixpanel.com", ["script", "xmlhttprequest", "ping"]),
    ("amplitude.com", ["script", "xmlhttprequest", "ping"]),
    ("segment.io", ["script", "xmlhttprequest", "ping"]),
    ("segment.com", ["script", "xmlhttprequest", "ping"]),
    ("heapanalytics.com", ["script", "xmlhttprequest"]),
    ("mouseflow.com", ["script", "xmlhttprequest"]),
    ("crazyegg.com", ["script", "xmlhttprequest"]),
    ("luckyorange.com", ["script", "xmlhttprequest"]),
    ("quantserve.com", ["script", "image", "xmlhttprequest"]),
    ("pubmatic.com", ["script", "image", "xmlhttprequest", "sub_frame"]),
    ("rubiconproject.com", ["script", "image", "xmlhttprequest", "sub_frame"]),
    ("openx.net", ["script", "image", "xmlhttprequest", "sub_frame"]),
    ("casalemedia.com", ["script", "image", "xmlhttprequest", "sub_frame"]),
    ("adroll.com", ["script", "image", "xmlhttprequest"]),
    ("analytics.tiktok.com", ["script", "xmlhttprequest", "ping"]),
    ("connect.facebook.net", ["script", "xmlhttprequest"]),
    ("pixel.facebook.com", ["image", "xmlhttprequest", "ping"]),
    ("snap.licdn.com", ["script", "image", "xmlhttprequest"]),
    ("px.ads.linkedin.com", ["image", "xmlhttprequest", "ping"]),
    ("ct.pinterest.com", ["script", "image", "xmlhttprequest"]),
    ("alb.reddit.com", ["image", "xmlhttprequest", "ping"]),
    ("events.redditmedia.com", ["image", "xmlhttprequest", "ping"]),
    ("sc-static.net", ["script"]),
    ("tr.snapchat.com", ["image", "xmlhttprequest", "ping"]),
    ("bat.bing.com", ["script", "image", "xmlhttprequest", "ping"]),
    ("ads-twitter.com", ["script", "image", "xmlhttprequest"]),
    ("analytics.twitter.com", ["image", "xmlhttprequest", "ping"]),
    ("posthog.com", ["script", "xmlhttprequest", "ping"]),
    ("us.i.posthog.com", ["xmlhttprequest", "ping"]),
    ("eu.i.posthog.com", ["xmlhttprequest", "ping"]),
    ("js-agent.newrelic.com", ["script"]),
    ("bam.nr-data.net", ["xmlhttprequest", "ping"]),
    ("browser-intake-datadoghq.com", ["xmlhttprequest", "ping"]),
    ("notify.bugsnag.com", ["xmlhttprequest", "ping"]),
    ("ingest.sentry.io", ["xmlhttprequest", "ping"]),
    ("api-js.mixpanel.com", ["xmlhttprequest", "ping"]),
    ("branch.io", ["script", "xmlhttprequest"]),
    ("app.link", ["xmlhttprequest", "ping"]),
    ("adjust.com", ["xmlhttprequest", "ping"]),
    ("appsflyer.com", ["xmlhttprequest", "ping"]),
    ("chartbeat.com", ["script", "ping"]),
    ("moatads.com", ["script", "image", "xmlhttprequest"]),
    ("revcontent.com", ["script", "image", "sub_frame"]),
    ("mgid.com", ["script", "image", "sub_frame"]),
    ("demdex.net", ["script", "image", "xmlhttprequest"]),
    ("omtrdc.net", ["script", "image", "xmlhttprequest"]),
    ("2mdn.net", ["script", "image", "sub_frame"]),
    ("adform.net", ["script", "image", "xmlhttprequest", "sub_frame"]),
    ("advertising.com", ["script", "image", "xmlhttprequest"]),
    ("smartadserver.com", ["script", "image", "xmlhttprequest", "sub_frame"]),
]

SPECIAL_URL_RULES = [
    ("||youtube.com/api/stats/ads*", ["xmlhttprequest", "ping"], 6),
    ("||youtube.com/pagead/*", ["xmlhttprequest", "script", "sub_frame"], 6),
    ("||google.com/pagead/*", ["xmlhttprequest", "script", "sub_frame", "ping"], 6),
]

UPSTREAM_RESOURCE_TYPES = ["script", "image", "xmlhttprequest", "sub_frame", "ping"]


def fetch_upstream_domains(timeout=10):
    try:
        req = urllib.request.Request(UPSTREAM_URL, headers={"User-Agent": "SemanticShield-Compiler/2.1"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("ascii", errors="ignore")
        domains = []
        for line in raw.splitlines():
            clean = line.strip().lower()
            if not clean or clean.startswith("#") or clean.startswith("!"):
                continue
            if DOMAIN_RE.match(clean):
                domains.append(clean)
        print(f"[*] Fetched {len(domains)} candidate upstream tracker domains.")
        return domains
    except Exception as exc:
        print(f"[!] Upstream fetch failed ({exc}); falling back safely to curated baseline.")
        return []


def compile_rules(fetch_upstream=False):
    rules = []
    seen_filters = set()
    rule_id = MIN_RULE_ID

    for domain, rtypes in CURATED_BASELINE_DOMAINS:
        url_filter = f"||{domain}^"
        if url_filter in seen_filters:
            continue
        seen_filters.add(url_filter)
        rules.append({
            "id": rule_id,
            "priority": 5,
            "action": {"type": "block"},
            "condition": {
                "urlFilter": url_filter,
                "resourceTypes": rtypes,
            },
        })
        rule_id += 1

    for url_filter, rtypes, priority in SPECIAL_URL_RULES:
        if url_filter in seen_filters:
            continue
        seen_filters.add(url_filter)
        rules.append({
            "id": rule_id,
            "priority": priority,
            "action": {"type": "block"},
            "condition": {
                "urlFilter": url_filter,
                "resourceTypes": rtypes,
            },
        })
        rule_id += 1

    if fetch_upstream:
        for domain in fetch_upstream_domains():
            if len(rules) >= MAX_STATIC_RULES:
                break
            url_filter = f"||{domain}^"
            if url_filter in seen_filters:
                continue
            seen_filters.add(url_filter)
            rules.append({
                "id": rule_id,
                "priority": 5,
                "action": {"type": "block"},
                "condition": {
                    "urlFilter": url_filter,
                    "resourceTypes": UPSTREAM_RESOURCE_TYPES,
                },
            })
            rule_id += 1

    return rules


def check_rules_file(path=RULES_FILE):
    if not path.is_file():
        print(f"[FAIL] Rules file missing: {path}", file=sys.stderr)
        return False

    rules = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(rules, list) or len(rules) == 0:
        print("[FAIL] core_ad_shield.json must be a non-empty array.", file=sys.stderr)
        return False

    if len(rules) > MAX_STATIC_RULES:
        print(f"[FAIL] Too many static rules ({len(rules)} > {MAX_STATIC_RULES}).", file=sys.stderr)
        return False

    seen_ids = set()
    seen_filters = set()
    for r in rules:
        rid = r.get("id")
        if not isinstance(rid, int) or not (MIN_RULE_ID <= rid <= MAX_RULE_ID):
            print(f"[FAIL] Invalid rule ID {rid} (must be in {MIN_RULE_ID}..{MAX_RULE_ID}).", file=sys.stderr)
            return False
        if rid in seen_ids:
            print(f"[FAIL] Duplicate rule ID {rid}.", file=sys.stderr)
            return False
        seen_ids.add(rid)

        action_type = r.get("action", {}).get("type")
        if action_type not in ("block", "allow"):
            print(f"[FAIL] Invalid action type '{action_type}' in rule {rid}.", file=sys.stderr)
            return False

        cond = r.get("condition", {})
        uf = cond.get("urlFilter", "")
        if not uf or not uf.isascii():
            print(f"[FAIL] Rule {rid} urlFilter must be non-empty ASCII.", file=sys.stderr)
            return False
        if uf in seen_filters:
            print(f"[FAIL] Duplicate urlFilter '{uf}' in rule {rid}.", file=sys.stderr)
            return False
        seen_filters.add(uf)

        rtypes = cond.get("resourceTypes")
        if not isinstance(rtypes, list) or len(rtypes) == 0:
            print(f"[FAIL] Rule {rid} missing resourceTypes.", file=sys.stderr)
            return False

    print(f"[PASS] Verified {len(rules)} static ad/tracker/telemetry rules in {path.name} (IDs {min(seen_ids)}..{max(seen_ids)}).")
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--fetch-upstream", action="store_true", help="Fetch & merge Peter Lowe upstream tracker list")
    parser.add_argument("--check", action="store_true", help="Validate existing rules/core_ad_shield.json only")
    args = parser.parse_args()

    if args.check:
        return 0 if check_rules_file() else 1

    rules = compile_rules(fetch_upstream=args.fetch_upstream)
    RULES_FILE.parent.mkdir(parents=True, exist_ok=True)
    RULES_FILE.write_text(json.dumps(rules, indent=2) + "\n", encoding="utf-8")
    print(f"[+] Wrote {len(rules)} rules to {RULES_FILE}")
    return 0 if check_rules_file() else 1


if __name__ == "__main__":
    sys.exit(main())
