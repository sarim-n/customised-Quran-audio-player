import os
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

pages_dir = "src/data/mushaf7/pages"
meta_file = "src/data/mushaf7/metadata.json"

if not os.path.exists(pages_dir) or not os.path.exists(meta_file):
    print("ERROR: Dataset directory src/data/mushaf7/ not found. Run scripts/build_mushaf7_dataset.py first.")
    sys.exit(1)

with open(meta_file, "r", encoding="utf-8") as f:
    meta = json.load(f)

page_files = [f for f in os.listdir(pages_dir) if f.startswith("page_") and f.endswith(".json")]
page_numbers = []

for f in page_files:
    num_str = f.replace("page_", "").replace(".json", "")
    if num_str.isdigit():
        page_numbers.append(int(num_str))

page_numbers.sort()
print("="*75)
print("MUSHAF 7 DATASET VALIDATION REPORT")
print("="*75)
print(f"Total Page Files Found: {len(page_numbers)}")
print(f"Page Range: {min(page_numbers)} to {max(page_numbers)}" if page_numbers else "No pages found")
print(f"Metadata Total Pages: {meta.get('totalPages')}")

errors = []
warnings = []

# 1. Page count check
if len(page_numbers) != 548:
    warnings.append(f"Expected 548 pages, found {len(page_numbers)}. (If using pre-live sandbox, range is limited to 1-45).")

# 2. Line numbers and word validity checks
pages_with_line_16 = []
page_10_words_count = 0
page_10_l16_words_count = 0

for p in page_numbers:
    path = os.path.join(pages_dir, f"page_{p}.json")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    lines = data.get("lines", {})
    total_words_on_page = 0
    for ln_str, words in lines.items():
        ln = int(ln_str)
        if ln < 1 or ln > 16:
            errors.append(f"Page {p} has invalid line number: {ln}")
        total_words_on_page += len(words)
        
        # Check word fields
        for w in words:
            if not w.get("text"):
                errors.append(f"Page {p} Line {ln} has empty word text")
            if not w.get("verseId"):
                errors.append(f"Page {p} Line {ln} missing verseId")
                
    if "16" in lines and len(lines["16"]) > 0:
        pages_with_line_16.append(p)
        
    if p == 10:
        page_10_words_count = total_words_on_page
        page_10_l16_words_count = len(lines.get("16", []))

# 3. Page 10 specific verification against authenticated baseline
print("\n--- PAGE 10 VERIFICATION (BASELINE CHECK) ---")
print(f"Page 10 Total Words: {page_10_words_count} (Expected: 157)")
print(f"Page 10 Line 16 Words: {page_10_l16_words_count} (Expected: 11)")

if page_10_words_count != 157:
    errors.append(f"Page 10 total words mismatch: got {page_10_words_count}, expected 157")
if page_10_l16_words_count != 11:
    errors.append(f"Page 10 line 16 words mismatch: got {page_10_l16_words_count}, expected 11")

# Summary
print("\n--- VALIDATION SUMMARY ---")
print(f"Pages containing Line 16: {len(pages_with_line_16)} pages")
print(f"Validation Errors: {len(errors)}")
print(f"Validation Warnings: {len(warnings)}")

if warnings:
    for w in warnings:
        print(f"  [WARNING] {w}")

if errors:
    for e in errors[:10]:
        print(f"  [ERROR] {e}")
    print("\nRESULT: FAILED VALIDATION")
    sys.exit(1)
else:
    print("\nRESULT: PASSED VALIDATION")
