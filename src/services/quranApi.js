import { RECITERS } from '../data/quranMeta.js';

const surahCache = new Map();
const juzCache = new Map();

/**
 * Fetch Surah with Arabic (Uthmani) text and English translation
 * @param {number} surahNumber (1-114)
 * @returns {Promise<{ surah: Object, ayahs: Array }>}
 */
export async function fetchSurah(surahNumber) {
  const cacheKey = `surah_${surahNumber}`;
  if (surahCache.has(cacheKey)) {
    return surahCache.get(cacheKey);
  }

  try {
    const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-uthmani,en.sahih`);
    if (!res.ok) {
      throw new Error(`Failed to load Surah ${surahNumber} (HTTP ${res.status})`);
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
 * Fetch raw Juz data from Al Quran Cloud API
 * @param {number} juzNumber (1-30)
 * @returns {Promise<{ juzNumber: number, ayahs: Array }>}
 */
async function fetchRawJuz(juzNumber) {
  const cacheKey = `raw_juz_${juzNumber}`;
  if (juzCache.has(cacheKey)) {
    return juzCache.get(cacheKey);
  }

  const [arabicRes, transRes] = await Promise.all([
    fetch(`https://api.alquran.cloud/v1/juz/${juzNumber}/quran-uthmani`),
    fetch(`https://api.alquran.cloud/v1/juz/${juzNumber}/en.sahih`)
  ]);

  if (!arabicRes.ok) {
    throw new Error(`Failed to load Juz ${juzNumber} (HTTP ${arabicRes.status})`);
  }

  const arabicJson = await arabicRes.json();
  let transJson = null;
  if (transRes.ok) {
    transJson = await transRes.json();
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
      // 4. Juz 3: ends at Surah 3 Ayah 91. Remove 3:92 from end.
      else if (juzNumber === 3 && ayahs.length > 0 && ayahs[ayahs.length - 1].numberInSurah === 92) {
        ayahs = ayahs.slice(0, -1);
      }
      // 5. Juz 11: starts at Surah 9 Ayah 94 (Ya'taziroona). Remove 9:93 from start.
      else if (juzNumber === 11 && ayahs.length > 0 && ayahs[0].surahNumber === 9 && ayahs[0].numberInSurah === 93) {
        ayahs = ayahs.slice(1);
      }
      // 6. Juz 10: ends at Surah 9 Ayah 93. Append 9:93 from Juz 11.
      else if (juzNumber === 10 && ayahs.length > 0 && ayahs[ayahs.length - 1].numberInSurah === 92) {
        const j11Raw = await fetchRawJuz(11);
        const ayah9_93 = j11Raw.ayahs.find(a => a.surahNumber === 9 && a.numberInSurah === 93);
        if (ayah9_93) ayahs = [...ayahs, ayah9_93];
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
 * Get Audio URL for an ayah given a reciter
 * @param {Object} ayah
 * @param {Object} reciter
 * @returns {string}
 */
export function getAyahAudioUrl(ayah, reciter) {
  if (!ayah || !ayah.number) return '';
  const base = reciter?.audioBase || RECITERS[0].audioBase;
  return `${base}/${ayah.number}.mp3`;
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
