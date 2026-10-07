import metadata from '../data/mushaf7/metadata.json';
import { SURAHS } from '../data/quranMeta';

// Lazy-loaded page modules via Vite glob import
const pageModules = import.meta.glob('../data/mushaf7/pages/page_*.json');

const pageCache = new Map();
const verseToPageMap = new Map();
const surahToPageMap = new Map();

// Helper to extract page number from module key
const availablePages = new Set();
for (const path of Object.keys(pageModules)) {
  const match = path.match(/page_(\d+)\.json$/);
  if (match) {
    availablePages.add(parseInt(match[1], 10));
  }
}

export const MUSHAF_7_TOTAL_PAGES = 548;
export const MUSHAF_7_AVAILABLE_PAGES = Math.max(...Array.from(availablePages), 45);

/**
 * Fetch a specific Mushaf 7 page
 * @param {number} pageNumber (1-548)
 * @returns {Promise<Object>}
 */
export async function fetchMushaf7Page(pageNumber) {
  const p = Math.max(1, Math.min(MUSHAF_7_TOTAL_PAGES, Number(pageNumber) || 1));
  const cacheKey = `mushaf7_page_${p}`;

  if (pageCache.has(cacheKey)) {
    return pageCache.get(cacheKey);
  }

  const modulePath = `../data/mushaf7/pages/page_${p}.json`;
  const loader = pageModules[modulePath];

  if (!loader) {
    throw new Error(`Mushaf 7 Page ${p} data is not currently available in the dataset.`);
  }

  const mod = await loader();
  const rawData = mod.default || mod;

  // Format lines into array of 1 to 16
  const lines = [];
  const linesObj = rawData.lines || {};
  for (let i = 1; i <= 16; i++) {
    const words = linesObj[String(i)] || linesObj[i] || [];
    const verseKeysOnLine = [...new Set(words.map(w => w.verseKey).filter(Boolean))];
    const surahsOnLine = [...new Set(words.map(w => w.surahNumber).filter(Boolean))];

    lines.push({
      lineNumber: i,
      words,
      verseKeysOnLine,
      surahsOnLine
    });

    // Populate lookup cache
    for (const w of words) {
      if (w.verseKey && !verseToPageMap.has(w.verseKey)) {
        verseToPageMap.set(w.verseKey, p);
      }
      if (w.surahNumber && !surahToPageMap.has(w.surahNumber)) {
        surahToPageMap.set(w.surahNumber, p);
      }
    }
  }

  const primarySurahNum = rawData.surahNumbers?.[0] || 1;
  const primarySurah = SURAHS.find(s => s.number === primarySurahNum) || SURAHS[0];

  const result = {
    pageNumber: p,
    totalPages: MUSHAF_7_TOTAL_PAGES,
    availablePages: MUSHAF_7_AVAILABLE_PAGES,
    primarySurah,
    surahNumbers: rawData.surahNumbers || [primarySurahNum],
    verseKeys: rawData.verseKeys || [],
    firstVerseKey: rawData.firstVerseKey,
    lastVerseKey: rawData.lastVerseKey,
    lines
  };

  pageCache.set(cacheKey, result);
  return result;
}

/**
 * Get starting page of a Surah for Mushaf 7
 * @param {number} surahNumber (1-114)
 * @returns {number}
 */
export function getMushaf7PageForSurah(surahNumber) {
  const sNum = Number(surahNumber);
  if (surahToPageMap.has(sNum)) {
    return surahToPageMap.get(sNum);
  }
  // Standard IndoPak 16-line known starts for early chapters
  if (sNum === 1) return 1;
  if (sNum === 2) return 2;
  return 1;
}

/**
 * Get starting page of an Ayah for Mushaf 7
 * @param {number} surahNumber
 * @param {number} numberInSurah
 * @returns {number}
 */
export function getMushaf7PageForAyah(surahNumber, numberInSurah) {
  const key = `${surahNumber}:${numberInSurah}`;
  if (verseToPageMap.has(key)) {
    return verseToPageMap.get(key);
  }
  return getMushaf7PageForSurah(surahNumber);
}

/**
 * Get starting page of a Juz for Mushaf 7
 * @param {number} juzNumber (1-30)
 * @returns {number}
 */
export function getMushaf7PageForJuz(juzNumber) {
  const jNum = Number(juzNumber);
  if (jNum === 1) return 1;
  if (jNum === 2) return 22; // In 16-line IndoPak, Juz 2 begins on page 22
  if (jNum === 3) return 42; // Juz 3 begins on page 42
  return 1;
}
