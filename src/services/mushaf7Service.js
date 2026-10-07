import metadata from '../data/mushaf7/metadata.json';
import { SURAHS } from '../data/quranMeta';
import taj16LineMapping from '../data/taj16LineMapping.json';

// Lazy-loaded page modules via Vite glob import (pages 1-45 from Quran Foundation snapshot)
const pageModules = import.meta.glob('../data/mushaf7/pages/page_*.json');

const pageCache = new Map();
const verseToPageMap = new Map();
const surahToPageMap = new Map();
const juzToPageMap = new Map();

export const MUSHAF_7_TOTAL_PAGES = 604;
export const MUSHAF_7_AVAILABLE_PAGES = 604;

// Build fast reverse lookup indices across all 604 pages of the 16-line Mushaf
try {
  for (let p = 1; p <= 604; p++) {
    const pStr = String(p);
    const pData = taj16LineMapping[pStr];
    if (pData) {
      if (pData.primaryJuz && !juzToPageMap.has(pData.primaryJuz)) {
        juzToPageMap.set(pData.primaryJuz, p);
      }
      if (pData.primarySurah && !surahToPageMap.has(pData.primarySurah)) {
        surahToPageMap.set(pData.primarySurah, p);
      }
      if (pData.surahNumbers) {
        for (const s of pData.surahNumbers) {
          if (!surahToPageMap.has(s)) {
            surahToPageMap.set(s, p);
          }
        }
      }
      if (pData.lines) {
        for (const lineWords of Object.values(pData.lines)) {
          for (const w of lineWords) {
            if (w) {
              if (w.surahNumber && !surahToPageMap.has(w.surahNumber)) {
                surahToPageMap.set(w.surahNumber, p);
              }
              if (w.verseKey && !verseToPageMap.has(w.verseKey)) {
                verseToPageMap.set(w.verseKey, p);
              }
            }
          }
        }
      }
    }
  }
} catch (e) {
  console.warn('Error indexing Mushaf 7 16-line mapping:', e);
}

/**
 * Fetch a specific Mushaf 7 page (1-604)
 * Uses high-fidelity snapshot for pages 1-45, seamlessly falling back to complete 16-line dataset for 46-604
 * @param {number} pageNumber (1-604)
 * @returns {Promise<Object>}
 */
export async function fetchMushaf7Page(pageNumber) {
  const p = Math.max(1, Math.min(MUSHAF_7_TOTAL_PAGES, Number(pageNumber) || 1));
  const cacheKey = `mushaf7_page_${p}`;

  if (pageCache.has(cacheKey)) {
    return pageCache.get(cacheKey);
  }

  // 1. If high-resolution page module exists (from QF snapshot 1-45), use it
  const modulePath = `../data/mushaf7/pages/page_${p}.json`;
  const loader = pageModules[modulePath];

  if (loader) {
    const mod = await loader();
    const rawData = mod.default || mod;

    const lines = [];
    const linesObj = rawData.lines || {};
    for (let i = 1; i <= 16; i++) {
      const words = (linesObj[String(i)] || linesObj[i] || []).map(w => ({
        ...w,
        text: w.text || w.textIndopak
      }));
      const verseKeysOnLine = [...new Set(words.map(w => w.verseKey).filter(Boolean))];
      const surahsOnLine = [...new Set(words.map(w => w.surahNumber).filter(Boolean))];

      lines.push({
        lineNumber: i,
        words,
        verseKeysOnLine,
        surahsOnLine
      });

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
    const primaryJuz = rawData.primaryJuz || taj16LineMapping[String(p)]?.primaryJuz || 1;

    const result = {
      pageNumber: p,
      totalPages: MUSHAF_7_TOTAL_PAGES,
      availablePages: MUSHAF_7_AVAILABLE_PAGES,
      primarySurah,
      primaryJuz,
      surahNumbers: rawData.surahNumbers || [primarySurahNum],
      verseKeys: rawData.verseKeys || [],
      firstVerseKey: rawData.firstVerseKey,
      lastVerseKey: rawData.lastVerseKey,
      lines
    };

    pageCache.set(cacheKey, result);
    return result;
  }

  // 2. Seamless full Quran coverage from 16-line IndoPak dataset (pages 46-604)
  const localPage = taj16LineMapping[String(p)];
  if (localPage) {
    const lines = [];
    const linesObj = localPage.lines || {};
    for (let i = 1; i <= 16; i++) {
      const rawWords = linesObj[String(i)] || linesObj[i] || [];
      const words = rawWords.map((w, wIdx) => {
        const textVal = w.textIndopak || w.text || '';
        const isEndMarker = w.charType === 'end' || textVal.includes('');
        return {
          wordId: w.wordId || `${p}_${i}_${wIdx + 1}`,
          verseId: w.verseId,
          surahNumber: w.surahNumber,
          numberInSurah: w.numberInSurah,
          verseKey: w.verseKey,
          text: textVal,
          textIndopak: textVal,
          charType: isEndMarker ? 'end' : (w.charType || 'word'),
          positionInLine: w.positionInLine || (wIdx + 1),
          positionInPage: w.positionInPage,
          positionInVerse: w.positionInVerse
        };
      });

      const verseKeysOnLine = [...new Set(words.map(w => w.verseKey).filter(Boolean))];
      const surahsOnLine = [...new Set(words.map(w => w.surahNumber).filter(Boolean))];

      lines.push({
        lineNumber: i,
        words,
        verseKeysOnLine,
        surahsOnLine
      });
    }

    const primarySurahNum = localPage.primarySurah || 1;
    const primarySurah = SURAHS.find(s => s.number === primarySurahNum) || SURAHS[0];

    const result = {
      pageNumber: p,
      totalPages: MUSHAF_7_TOTAL_PAGES,
      availablePages: MUSHAF_7_AVAILABLE_PAGES,
      primarySurah,
      primaryJuz: localPage.primaryJuz || 1,
      surahNumbers: localPage.surahNumbers || [primarySurahNum],
      verseKeys: lines.flatMap(l => l.verseKeysOnLine),
      firstVerseKey: localPage.firstVerse,
      lastVerseKey: localPage.lastVerse,
      lines
    };

    pageCache.set(cacheKey, result);
    return result;
  }

  throw new Error(`Mushaf 7 Page ${p} data is not currently available in the dataset.`);
}

/**
 * Get starting page of a Surah for Mushaf 7 (1-114)
 * @param {number} surahNumber (1-114)
 * @returns {number}
 */
export function getMushaf7PageForSurah(surahNumber) {
  const sNum = Number(surahNumber);
  if (surahToPageMap.has(sNum)) {
    return surahToPageMap.get(sNum);
  }
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
 * Get starting page of a Juz for Mushaf 7 (1-30)
 * @param {number} juzNumber (1-30)
 * @returns {number}
 */
export function getMushaf7PageForJuz(juzNumber) {
  const jNum = Number(juzNumber);
  if (juzToPageMap.has(jNum)) {
    return juzToPageMap.get(jNum);
  }
  return 1;
}
