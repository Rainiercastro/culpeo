"""Dev-time only: fetch images directly from Wikimedia Commons (Openverse's API was down / 502).
Not shipped. Downloads originals to assets/photos/source/, writes assets/credits.json.
"""
import json, os, sys, time, urllib.request, urllib.parse

API = "https://commons.wikimedia.org/w/api.php"
UA = "CulpeoWebsiteBuilder/1.0 (contact: rainiercastro.e@gmail.com; educational/small-business site build)"
SAFE_LICENSES = ("cc0", "cc-by", "cc-by-sa", "pd", "public domain")

def api_get(params):
    params = dict(params)
    params["format"] = "json"
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=25) as r:
        return json.loads(r.read().decode("utf-8"))

def search_one(query, min_width=1200):
    data = api_get({
        "action": "query", "generator": "search", "gsrsearch": query,
        "gsrnamespace": 6, "gsrlimit": 6, "prop": "imageinfo",
        "iiprop": "url|size|extmetadata|mime", "iiurlwidth": 1800,
    })
    pages = (data.get("query") or {}).get("pages") or {}
    candidates = list(pages.values())
    # Prefer larger, safely-licensed, actual photos (jpg/png)
    def score(p):
        info = (p.get("imageinfo") or [{}])[0]
        mime = info.get("mime", "")
        w = info.get("width", 0)
        meta = info.get("extmetadata", {})
        lic = (meta.get("LicenseShortName", {}) or {}).get("value", "").lower()
        ok_mime = 1 if mime in ("image/jpeg", "image/png") else 0
        ok_lic = 1 if any(s in lic for s in SAFE_LICENSES) else 0
        return (ok_mime, ok_lic, min(w, 6000))
    candidates.sort(key=score, reverse=True)
    for p in candidates:
        info = (p.get("imageinfo") or [{}])[0]
        if not info:
            continue
        mime = info.get("mime", "")
        if mime not in ("image/jpeg", "image/png"):
            continue
        if info.get("width", 0) < min_width:
            continue
        meta = info.get("extmetadata", {})
        lic = (meta.get("LicenseShortName", {}) or {}).get("value", "Unknown")
        return {
            "title": p.get("title", "").replace("File:", ""),
            "download_url": info.get("thumburl") or info.get("url"),
            "page_url": info.get("descriptionurl"),
            "artist": _strip_html((meta.get("Artist", {}) or {}).get("value", "Unknown")),
            "credit": _strip_html((meta.get("Credit", {}) or {}).get("value", "Wikimedia Commons")),
            "license": lic,
            "license_url": (meta.get("LicenseUrl", {}) or {}).get("value", "https://creativecommons.org/"),
        }
    return None

def _strip_html(s):
    import re
    return re.sub("<[^>]+>", "", s or "").strip()

def main():
    queries_path = sys.argv[sys.argv.index("--queries") + 1]
    target = sys.argv[sys.argv.index("--target") + 1]
    credits_path = sys.argv[sys.argv.index("--credits") + 1]
    with open(queries_path, "r", encoding="utf-8") as f:
        queries = json.load(f)

    os.makedirs(target, exist_ok=True)
    credits = {}
    if os.path.exists(credits_path):
        try:
            with open(credits_path, "r", encoding="utf-8") as f:
                credits = json.load(f)
        except Exception:
            credits = {}

    ok, fail = 0, 0
    for q in queries:
        qid = q["id"]
        query = q["query"]
        print(f"  [{qid:<24}] \"{query}\" ...", end=" ", flush=True)
        try:
            result = search_one(query)
            if not result:
                print("NO MATCH")
                fail += 1
                continue
            ext = ".jpg" if result["download_url"].lower().endswith((".jpg", ".jpeg")) else ".png"
            out_path = os.path.join(target, qid + ext)
            req = urllib.request.Request(result["download_url"], headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=40) as r, open(out_path, "wb") as f:
                f.write(r.read())
            credits[qid] = {
                "id": qid, "src": f"assets/img/{qid}.webp", "title": result["title"],
                "creator": result["artist"] or result["credit"], "creator_url": result["page_url"],
                "license": result["license"], "license_url": result["license_url"],
                "foreign_landing_url": result["page_url"], "source": "Wikimedia Commons",
            }
            print(f"OK  {result['title'][:60]}")
            ok += 1
        except Exception as e:
            print(f"ERROR {e}")
            fail += 1
        time.sleep(0.4)

    with open(credits_path, "w", encoding="utf-8") as f:
        json.dump(credits, f, ensure_ascii=False, indent=2)

    print(f"\nSummary: {ok} downloaded, {fail} failed. Credits -> {credits_path}")

if __name__ == "__main__":
    main()
