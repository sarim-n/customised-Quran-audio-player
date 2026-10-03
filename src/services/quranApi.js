import { RECITERS, SURAHS } from '../data/quranMeta.js';

export const API_CACHE_NAME = 'quran-api-v1';

const surahCache = new Map();
const juzCache = new Map();

/**
 * Fetch Surah with Arabic (Uthmani) text and English translation.
 * Includes offline Cache API fallback for complete offline access.
 * @param {number} surahNumber (1-114)
 * @returns {Promise<{ surah: Object, ayahs: Array }>}
 */
export async function fetchSurah(surahNumber) {
  const cacheKey = `surah_${surahNumber}`;
  if (surahCache.has(cacheKey)) {
    return surahCache.get(cacheKey);
  }

  const apiUrl = `https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-uthmani,en.sahih`;

  try {
    let res = null;
    try {
      res = await fetch(apiUrl);
      if (res.ok && typeof window !== 'undefined' && 'caches' in window) {
        caches.open(API_CACHE_NAME).then(c => c.put(apiUrl, res.clone())).catch(() => {});
      }
    } catch (netErr) {
      // Offline fallback: load from Cache Storage
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cache = await caches.open(API_CACHE_NAME);
        res = await cache.match(apiUrl);
      }
      if (!res) throw netErr;
    }

    if (!res || !res.ok) {
      // If network response was not ok, check cache fallback
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cache = await caches.open(API_CACHE_NAME);
        const cachedRes = await cache.match(apiUrl);
        if (cachedRes) res = cachedRes;
      }
    }

    if (!res || !res.ok) {
      throw new Error(`Failed to load Surah ${surahNumber} (HTTP ${res ? res.status : 'offline'})`);
    }

    const json = await res.json();
    if (json.code !== 200 || !json.data || json.data.length < 2) {
      throw new Error(json.data || `API returned error status ${json.code}`);
    }

    const arabicEdition = json.data[0];
    const translationEdition = json.data[1];

    const ayahs = arabicEdition.ayahs.map((ayah, index) => {
      const transAyah = translationEdition.ayahs[index];
      return {
        number: ayah.number, // global 1-6236
        numberInSurah: ayah.numberInSurah,
        text: cleanAyahText(ayah.text, surahNumber, ayah.numberInSurah),
        rawText: ayah.text,
        translation: transAyah ? transAyah.text : '',
        juz: ayah.juz,
        page: ayah.page,
        manzil: ayah.manzil,
        ruku: ayah.ruku,
        hizbQuarter: ayah.hizbQuarter,
        sajda: ayah.sajda,
        surahNumber: surahNumber,
        surahName: arabicEdition.name,
        surahEnglishName: arabicEdition.englishName
      };
    });

    const result = {
      surah: {
        number: arabicEdition.number,
        name: arabicEdition.name,
        englishName: arabicEdition.englishName,
        englishNameTranslation: arabicEdition.englishNameTranslation,
        numberOfAyahs: arabicEdition.numberOfAyahs,
        revelationType: arabicEdition.revelationType
      },
      ayahs
    };

    surahCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error(`Error fetching Surah ${surahNumber}:`, error);
    throw error;
  }
}

/**
 * Fetch raw Juz data from Al Quran Cloud API with offline Cache API fallback
 * @param {number} juzNumber (1-30)
 * @returns {Promise<{ juzNumber: number, ayahs: Array }>}
 */
async function fetchRawJuz(juzNumber) {
  const cacheKey = `raw_juz_${juzNumber}`;
  if (juzCache.has(cacheKey)) {
    return juzCache.get(cacheKey);
  }

  const arabicUrl = `https://api.alquran.cloud/v1/juz/${juzNumber}/quran-uthmani`;
  const transUrl = `https://api.alquran.cloud/v1/juz/${juzNumber}/en.sahih`;

  const fetchWithFallback = async (url) => {
    try {
      const res = await fetch(url);
      if (res.ok && typeof window !== 'undefined' && 'caches' in window) {
        caches.open(API_CACHE_NAME).then(c => c.put(url, res.clone())).catch(() => {});
      }
      return res;
    } catch (err) {
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cache = await caches.open(API_CACHE_NAME);
        const cached = await cache.match(url);
        if (cached) return cached;
      }
      throw err;
    }
  };

  const [arabicRes, transRes] = await Promise.all([
    fetchWithFallback(arabicUrl),
    fetchWithFallback(transUrl).catch(() => null)
  ]);

  if (!arabicRes || !arabicRes.ok) {
    throw new Error(`Failed to load Juz ${juzNumber} (HTTP ${arabicRes ? arabicRes.status : 'offline'})`);
  }

  const arabicJson = await arabicRes.json();
  let transJson = null;
  if (transRes && transRes.ok) {
    try {
      transJson = await transRes.json();
    } catch {}
  }

  if (arabicJson.code !== 200 || !arabicJson.data?.ayahs) {
    throw new Error(arabicJson.data || `API returned error status ${arabicJson.code}`);
  }

  const transAyahs = transJson?.data?.ayahs || [];
  const transMap = new Map();
  transAyahs.forEach(a => transMap.set(a.number, a.text));

  const ayahs = arabicJson.data.ayahs.map(ayah => {
    return {
      number: ayah.number, // global 1-6236
      numberInSurah: ayah.numberInSurah,
      text: cleanAyahText(ayah.text, ayah.surah?.number, ayah.numberInSurah),
      rawText: ayah.text,
      translation: transMap.get(ayah.number) || '',
      juz: ayah.juz,
      page: ayah.page,
      manzil: ayah.manzil,
      ruku: ayah.ruku,
      hizbQuarter: ayah.hizbQuarter,
      sajda: ayah.sajda,
      surahNumber: ayah.surah?.number,
      surahName: ayah.surah?.name,
      surahEnglishName: ayah.surah?.englishName
    };
  });

  const result = { juzNumber, ayahs };
  juzCache.set(cacheKey, result);
  return result;
}

/**
 * Fetch Juz with Arabic (Uthmani) text and English translation,
 * supporting both Indo-Pak (Subcontinent) and Madani conventions
 * @param {number} juzNumber (1-30)
 * @param {'indopak' | 'madani'} convention
 * @returns {Promise<{ juzNumber: number, ayahs: Array }>}
 */
export async function fetchJuz(juzNumber, convention = 'indopak') {
  const cacheKey = `juz_${juzNumber}_${convention}`;
  if (juzCache.has(cacheKey)) {
    return juzCache.get(cacheKey);
  }

  try {
    const raw = await fetchRawJuz(juzNumber);
    let ayahs = [...raw.ayahs];

    if (convention === 'indopak') {
      // 1. Juz 7: starts at Surah 5 Ayah 83 (Wa Iza Sami'oo). Remove 5:82 from start.
      if (juzNumber === 7 && ayahs.length > 0 && ayahs[0].surahNumber === 5 && ayahs[0].numberInSurah === 82) {
        ayahs = ayahs.slice(1);
      }
      // 2. Juz 6: ends at Surah 5 Ayah 82. Append 5:82 from Juz 7.
      else if (juzNumber === 6 && ayahs.length > 0 && ayahs[ayahs.length - 1].numberInSurah === 81) {
        const j7Raw = await fetchRawJuz(7);
        const ayah5_82 = j7Raw.ayahs.find(a => a.surahNumber === 5 && a.numberInSurah === 82);
        if (ayah5_82) ayahs = [...ayahs, ayah5_82];
      }
      // 3. Juz 4: starts at Surah 3 Ayah 92 (Lan Tanaaloo). Prepend 3:92 from Juz 3.
      else if (juzNumber === 4 && ayahs.length > 0 && ayahs[0].surahNumber === 3 && ayahs[0].numberInSurah === 93) {
        const j3Raw = await fetchRawJuz(3);
        const ayah3_92 = j3Raw.ayahs.find(a => a.surahNumber === 3 && a.numberInSurah === 92);
        if (ayah3_92) ayahs = [ayah3_92, ...ayahs];
      }
    }

    const result = {
      juzNumber,
      convention,
      ayahs
    };

    juzCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error(`Error fetching Juz ${juzNumber} (${convention}):`, error);
    throw error;
  }
}

/**
 * Convert global ayah index (1-6236) to { surahNumber, numberInSurah }
 */
export function getSurahAndAyahFromGlobal(globalAyahNumber) {
  let remaining = globalAyahNumber;
  for (const surah of SURAHS) {
    if (remaining <= surah.numberOfAyahs) {
      return { surahNumber: surah.number, numberInSurah: remaining };
    }
    remaining -= surah.numberOfAyahs;
  }
  return { surahNumber: 1, numberInSurah: 1 };
}

/**
 * Get Audio URL for an ayah given a reciter (EveryAyah CDN with 100% CORS and high quality audio)
 * @param {Object} ayah
 * @param {Object|string} reciter
 * @returns {string}
 */
export function getAyahAudioUrl(ayah, reciter) {
  if (!ayah) return '';
  let sNum = ayah.surahNumber;
  let aNum = ayah.numberInSurah;

  if (!sNum || !aNum) {
    if (ayah.number) {
      const pos = getSurahAndAyahFromGlobal(ayah.number);
      sNum = pos.surahNumber;
      aNum = pos.numberInSurah;
    } else {
      return '';
    }
  }

  const surahStr = String(sNum).padStart(3, '0');
  const ayahStr = String(aNum).padStart(3, '0');

  const recId = reciter?.id || (typeof reciter === 'string' ? reciter : 'ar.alafasy');
  const rec = RECITERS.find(r => r.id === recId) || RECITERS[0];
  const folder = rec.folder || 'Alafasy_128kbps';
  return `https://everyayah.com/data/${folder}/${surahStr}${ayahStr}.mp3`;
}

/**
 * Clean up leading Bismillah if attached to ayah 1 for surahs > 1 and != 9
 * so we can display Bismillah ornamentally without duplication if desired
 */
function cleanAyahText(text, surahNumber, numberInSurah) {
  if (!text) return '';
  // Keep original text intact for authentic Quran recitation & reading
  return text.trim();
}
