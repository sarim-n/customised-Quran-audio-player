import json
import urllib.request
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.stdout.reconfigure(encoding='utf-8')

print("Fast Multi-threaded Taj 16-Line Page Mapping Builder...")

output_file = os.path.join('src', 'data', 'taj16LineMapping.json')
os.makedirs(os.path.dirname(output_file), exist_ok=True)

mapping = {}

def fetch_single_page(page):
    url = f"https://api.quran.com/api/v4/verses/by_page/{page}?mushaf=7&words=true&word_fields=line_number,text_indopak"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            data = json.loads(res.read().decode('utf-8'))
            verses = data.get('verses', [])
            
            lines_data = {}
            for i in range(1, 17):
                lines_data[str(i)] = []
                
            surahs_set = set()
            juz_set = set()

            for v in verses:
                v_key = v['verse_key']
                s_num, a_num = map(int, v_key.split(':'))
                surahs_set.add(s_num)
                if v.get('juz_number'):
                    juz_set.add(v['juz_number'])
                    
                for w in v.get('words', []):
                    line_n = str(w.get('line_number', 1))
                    if line_n not in lines_data:
                        lines_data[line_n] = []
                    
                    word_obj = {
                        'textIndopak': w.get('text_indopak') or w.get('text'),
                        'charType': w.get('char_type_name'),
                        'surahNumber': s_num,
                        'numberInSurah': a_num,
                        'verseKey': v_key
                    }
                    lines_data[line_n].append(word_obj)

            return page, {
                'pageNumber': page,
                'primarySurah': list(surahs_set)[0] if surahs_set else 1,
                'surahNumbers': list(surahs_set),
                'primaryJuz': list(juz_set)[0] if juz_set else 1,
                'firstVerse': verses[0]['verse_key'] if verses else "1:1",
                'lastVerse': verses[-1]['verse_key'] if verses else "1:7",
                'lines': lines_data
            }
    except Exception as e:
        print(f"Error on page {page}: {e}")
        return page, None

start_time = time.time()

with ThreadPoolExecutor(max_workers=25) as executor:
    futures = [executor.submit(fetch_single_page, p) for p in range(1, 549)]
    completed_count = 0
    for future in as_completed(futures):
        page, data = future.result()
        if data:
            mapping[str(page)] = data
        completed_count += 1
        if completed_count % 50 == 0 or completed_count == 548:
            print(f"Fetched {completed_count} / 548 pages...")

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(mapping, f, ensure_ascii=False, indent=2)

elapsed = time.time() - start_time
print(f"DONE! Taj 16-Line Mapping saved to {output_file} in {elapsed:.2f} seconds.")
