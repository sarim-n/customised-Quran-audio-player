import pypdfium2 as pdfium
import os
import time

pdf_path = '103935272-Al-Quran-16-Lines.pdf'
output_dir = os.path.join('public', 'mushaf_pages')
os.makedirs(output_dir, exist_ok=True)

print("Opening Taj Company 16-Line Quran PDF...")
pdf = pdfium.PdfDocument(pdf_path)
total_pdf_pages = len(pdf)
print(f"Total PDF Pages: {total_pdf_pages}")

# Offset: Quran Page 1 is PDF Page 2 (index 1)
# Quran Page 2 is PDF Page 3 (index 2)
# ... Quran Page 548 is PDF Page 549 (index 548)
TOTAL_QURAN_PAGES = 548

start_time = time.time()
print("Starting extraction of 548 Taj Company 16-line Mushaf page images...")

for quran_page in range(1, TOTAL_QURAN_PAGES + 1):
    pdf_idx = quran_page # Index in PDF (0-indexed): page 1 -> index 1
    if pdf_idx < total_pdf_pages:
        page = pdf[pdf_idx]
        # Render at 1.8x scale for sharp text while maintaining optimal file size
        image = page.render(scale=1.8).to_pil()
        out_path = os.path.join(output_dir, f"page_{quran_page}.webp")
        image.save(out_path, format="WEBP", quality=85)
        if quran_page % 50 == 0 or quran_page == TOTAL_QURAN_PAGES:
            print(f"Extracted {quran_page} / {TOTAL_QURAN_PAGES} pages...")

elapsed = time.time() - start_time
print(f"DONE! Extracted {TOTAL_QURAN_PAGES} pages in {elapsed:.2f} seconds.")
