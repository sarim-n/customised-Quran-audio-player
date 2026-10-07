import os
import sys
import json
import base64
import urllib.request
import urllib.parse
import urllib.error
import ssl
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv('.env')

client_id = os.environ.get("QF_CLIENT_ID", "").strip().strip('"').strip("'").strip()
client_secret = os.environ.get("QF_CLIENT_SECRET", "").strip().strip('"').strip("'").strip()

if not client_id or not client_secret:
    print("ERROR: QF_CLIENT_ID or QF_CLIENT_SECRET missing in .env")
    sys.exit(1)

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

SURAH_VERSES = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109,
  123, 111, 43, 52, 99, 128, 111, 110, 98, 135,
  112, 78, 118, 64, 77, 227, 93, 88, 69, 60,
  34, 30, 73, 54, 45, 83, 182, 88, 75, 85,
  54, 53, 89, 59, 37, 35, 38, 29, 18, 45,
  60, 49, 62, 55, 78, 96, 29, 22, 24, 13,
  14, 11, 11, 18, 12, 12, 30, 52, 52, 44,
  28, 28, 20, 56, 40, 31, 50, 40, 46, 42,
  29, 19, 36, 25, 22, 17, 19, 26, 30, 20,
  15, 21, 11, 8, 8, 19, 5, 8, 8, 11,
  11, 8, 3, 9, 5, 4, 7, 3, 6, 3,
  5, 4, 5, 6
]

def get_verse_info(v_id):
    if not v_id:
        return 1, 1, "1:1"
    cur = 0
    for s_idx, count in enumerate(SURAH_VERSES):
        if cur + count >= v_id:
            s_num = s_idx + 1
            n_in_s = v_id - cur
            return s_num, n_in_s, f"{s_num}:{n_in_s}"
        cur += count
    return 1, 1, "1:1"

def authenticate():
    auth_endpoints = [
        ("production", "https://oauth2.quran.foundation/oauth2/token", "https://apis.quran.foundation"),
        ("prelive", "https://prelive-oauth2.quran.foundation/oauth2/token", "https://apis-prelive.quran.foundation")
    ]
    
    basic_val = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    payload = urllib.parse.urlencode({"grant_type": "client_credentials", "scope": "content"}).encode()
    
    for env_name, token_url, api_base in auth_endpoints:
        req = urllib.request.Request(token_url, data=payload, method="POST")
        req.add_header("Authorization", f"Basic {basic_val}")
        req.add_header("Content-Type", "application/x-www-form-urlencoded")
        req.add_header("User-Agent", "Mozilla/5.0")
        
        try:
            with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                tok = data.get("access_token")
                if tok:
                    print(f"[AUTH] Successfully authenticated via {env_name.upper()} environment.")
                    return tok, api_base, env_name
        except urllib.error.HTTPError as e:
            err = e.read().decode('utf-8', errors='ignore')
            print(f"[AUTH] {env_name} token request returned HTTP {e.code}: {err[:80]}")
        except Exception as e:
            print(f"[AUTH] {env_name} error: {e}")
            
    return None, None, None

token, api_base, env_name = authenticate()
if not token:
    print("ERROR: Authentication failed. Please verify credentials in .env")
    sys.exit(1)

# Check snapshot download
snapshot_path = "scratch/mushaf7_full_snapshot.json"
os.makedirs("scratch", exist_ok=True)

url = f"{api_base}/content/api/v4/resources/snapshots/mushafs/7"
print(f"Fetching Mushaf 7 snapshot from {url}...")
req = urllib.request.Request(url)
req.add_header("x-auth-token", token)
req.add_header("x-client-id", client_id)
req.add_header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
req.add_header("Accept", "application/json")

with urllib.request.urlopen(req, context=ctx, timeout=60) as resp:
    raw = resp.read()
    if raw[:2] == b'\x1f\x8b':
        import gzip
        raw = gzip.decompress(raw)
    data = json.loads(raw.decode('utf-8'))

with open(snapshot_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False)

records = data.get("records", [])
print(f"Retrieved {len(records)} records from snapshot.")

# Parse pages
pages_data = {}
for r in records:
    if r.get("record_type") == "mushaf_word":
        p = r.get("page_number")
        ln = r.get("line_number")
        v_id = r.get("verse_id")
        s_num, n_in_s, v_key = get_verse_info(v_id)
        
        if p:
            if p not in pages_data:
                pages_data[p] = {
                    "pageNumber": p,
                    "lines": {},
                    "verseKeys": set(),
                    "surahNumbers": set()
                }
            if ln:
                if str(ln) not in pages_data[p]["lines"]:
                    pages_data[p]["lines"][str(ln)] = []
                word_entry = {
                    "wordId": r.get("word_id"),
                    "verseId": v_id,
                    "surahNumber": s_num,
                    "numberInSurah": n_in_s,
                    "verseKey": v_key,
                    "text": r.get("text"),
                    "charType": r.get("char_type_name"),
                    "positionInLine": r.get("position_in_line"),
                    "positionInPage": r.get("position_in_page"),
                    "positionInVerse": r.get("position_in_verse"),
                    "cssClass": r.get("css_class")
                }
                pages_data[p]["lines"][str(ln)].append(word_entry)
            if v_key:
                pages_data[p]["verseKeys"].add(v_key)
                pages_data[p]["surahNumbers"].add(s_num)

print(f"Parsed {len(pages_data)} pages from snapshot.")
out_dir = "src/data/mushaf7/pages"
os.makedirs(out_dir, exist_ok=True)

for p, p_info in pages_data.items():
    v_keys_list = sorted(list(p_info["verseKeys"]), key=lambda x: [int(n) for n in x.split(':')])
    p_info["verseKeys"] = v_keys_list
    p_info["surahNumbers"] = sorted(list(p_info["surahNumbers"]))
    p_info["firstVerseKey"] = v_keys_list[0] if v_keys_list else None
    p_info["lastVerseKey"] = v_keys_list[-1] if v_keys_list else None
    
    out_file = os.path.join(out_dir, f"page_{p}.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(p_info, f, ensure_ascii=False, indent=2)

# Write metadata
meta = {
    "mushafId": 7,
    "name": "IndoPak 16-Line",
    "totalPages": len(pages_data),
    "linesPerPage": 16,
    "environment": env_name,
    "source": "Quran Foundation Content Sync"
}
with open("src/data/mushaf7/metadata.json", "w", encoding="utf-8") as f:
    json.dump(meta, f, ensure_ascii=False, indent=2)

print(f"Generated dataset in src/data/mushaf7/ with {len(pages_data)} pages.")
