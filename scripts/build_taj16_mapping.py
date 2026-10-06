import json
import urllib.request
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

print("Building Taj Company 16-Line Page Mapping Index...")

output_file = os.path.join('src', 'data', 'taj16LineMapping.json')
os.makedirs(os.path.dirname(output_file), exist_ok=True)

mapping = {}

# Fetch mapping for pages 1 to 548
for page in range(1, 549):
    url = f"https://api.quran.com/api/v4/verses/by_page/{page}?mushaf=7&words=true&word_fields=line_number,text_indopak"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as res:
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

            mapping[str(page)] = {
                'pageNumber': page,
                'primarySurah': list(surahs_set)[0] if surahs_set else 1,
                'surahNumbers': list(surahs_set),
                'primaryJuz': list(juz_set)[0] if juz_set else 1,
                'firstVerse': verses[0]['verse_key'] if verses else "1:1",
                'lastVerse': verses[-1]['verse_key'] if verses else "1:7",
                'lines': lines_data
            }
            if page % 50 == 0 or page == 548:
                print(f"Mapped {page} / 548 pages...")
    except Exception as e:
        print(f"Error fetching page {page}: {e}")

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(mapping, f, ensure_ascii=False, indent=2)

print(f"DONE! Taj 16-Line Mapping saved to {output_file}")
