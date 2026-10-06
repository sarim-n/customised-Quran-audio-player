// Storage service for Quran Memorization Weak Spots / Mistake Tracking

const STORAGE_KEY = 'quran_weak_spots_v1';

/**
 * Get all weak spots mapped by id
 * @returns {Record<string, Object>}
 */
function getWeakSpotsMap() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('Failed to parse weak spots storage:', err);
    return {};
  }
}

/**
 * Save weak spots map to localStorage and dispatch update event
 * @param {Record<string, Object>} map
 */
function saveWeakSpotsMap(map) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent('quran-weak-spots-updated'));
  } catch (err) {
    console.error('Failed to save weak spots storage:', err);
  }
}

/**
 * Get all weak spots as a sorted array (newest lastMarked first)
 * @returns {Array<Object>}
 */
export function getWeakSpots() {
  const map = getWeakSpotsMap();
  const list = Object.values(map);
  return list.sort((a, b) => new Date(b.lastMarked) - new Date(a.lastMarked));
}

/**
 * Check if an Ayah is marked as a weak spot
 * @param {number} surahNumber
 * @param {number} numberInSurah
 * @returns {boolean}
 */
export function isWeakSpot(surahNumber, numberInSurah) {
  if (!surahNumber || !numberInSurah) return false;
  const map = getWeakSpotsMap();
  const id = `${surahNumber}:${numberInSurah}`;
  return Boolean(map[id]);
}

/**
 * Get item by id
 * @param {number} surahNumber
 * @param {number} numberInSurah
 * @returns {Object|null}
 */
export function getWeakSpotItem(surahNumber, numberInSurah) {
  if (!surahNumber || !numberInSurah) return null;
  const map = getWeakSpotsMap();
  const id = `${surahNumber}:${numberInSurah}`;
  return map[id] || null;
}

/**
 * Mark a mistake on an Ayah (Single status: either Memory Gap or Word Slip)
 * @param {Object} ayah - Ayah object with surahNumber, numberInSurah, text, translation, juz, ruku
 * @param {Object} [surahMeta] - Surah metadata object
 * @param {'memory_gap'|'word_highlight'} [mistakeType='memory_gap']
 * @param {Array<number>} [initialHighlightedWords=[]]
 * @returns {Object} Weak spot item
 */
export function markMistake(ayah, surahMeta = null, mistakeType = 'memory_gap', initialHighlightedWords = []) {
  if (!ayah || !ayah.surahNumber || !ayah.numberInSurah) return null;

  const map = getWeakSpotsMap();
  const id = `${ayah.surahNumber}:${ayah.numberInSurah}`;
  const now = new Date().toISOString();

  const existing = map[id];
  const surahEnglishName = ayah.surahEnglishName || surahMeta?.englishName || `Surah ${ayah.surahNumber}`;
  const surahArabicName = ayah.surahName || surahMeta?.name || '';
  const juzNumber = ayah.juz || surahMeta?.juz || 1;

  const item = {
    id,
    surahNumber: ayah.surahNumber,
    numberInSurah: ayah.numberInSurah,
    surahEnglishName,
    surahArabicName,
    juzNumber,
    ruku: ayah.ruku || null,
    text: ayah.text || existing?.text || '',
    translation: ayah.translation || existing?.translation || '',
    mistakeType: mistakeType || existing?.mistakeType || 'memory_gap',
    highlightedWords: initialHighlightedWords.length > 0 ? initialHighlightedWords : (existing?.highlightedWords || []),
    lastMarked: now,
    createdAt: existing ? existing.createdAt : now
  };

  map[id] = item;
  saveWeakSpotsMap(map);
  return item;
}

/**
 * Toggle word highlight index for an Ayah text
 * Automatically sets mistakeType to 'word_highlight'
 * @param {number} surahNumber
 * @param {number} numberInSurah
 * @param {number} wordIndex
 * @param {Object} [ayah] - Optional ayah object if not yet saved
 * @param {Object} [surahMeta] - Optional surahMeta
 * @returns {Array<number>} Updated array of highlighted word indices
 */
export function toggleWordHighlight(surahNumber, numberInSurah, wordIndex, ayah = null, surahMeta = null) {
  const map = getWeakSpotsMap();
  const id = `${surahNumber}:${numberInSurah}`;
  let item = map[id];

  if (!item && ayah) {
    item = markMistake(ayah, surahMeta, 'word_highlight', [wordIndex]);
    return item.highlightedWords;
  }

  if (!item) return [];

  const currentList = Array.isArray(item.highlightedWords) ? [...item.highlightedWords] : [];
  const idx = currentList.indexOf(wordIndex);
  if (idx !== -1) {
    currentList.splice(idx, 1);
  } else {
    currentList.push(wordIndex);
  }

  item.highlightedWords = currentList;
  if (currentList.length > 0) {
    item.mistakeType = 'word_highlight';
  }
  item.lastMarked = new Date().toISOString();

  map[id] = item;
  saveWeakSpotsMap(map);
  return currentList;
}

/**
 * Completely remove a weak spot
 * @param {number} surahNumber
 * @param {number} numberInSurah
 */
export function removeWeakSpot(surahNumber, numberInSurah) {
  const map = getWeakSpotsMap();
  const id = `${surahNumber}:${numberInSurah}`;
  if (map[id]) {
    delete map[id];
    saveWeakSpotsMap(map);
  }
}

/**
 * Clear all recorded weak spots
 */
export function clearAllWeakSpots() {
  saveWeakSpotsMap({});
}

/**
 * Get total count of weak ayahs overall
 * @returns {number}
 */
export function getWeakSpotsCount() {
  const map = getWeakSpotsMap();
  return Object.keys(map).length;
}

/**
 * Get count of weak spots for specific scope (Surah or Juz)
 * @param {string} viewMode - 'surah' | 'juz'
 * @param {number} currentSurahNumber
 * @param {number} currentJuzNumber
 * @returns {number}
 */
export function getWeakSpotsCountForScope(viewMode, currentSurahNumber, currentJuzNumber) {
  const map = getWeakSpotsMap();
  const list = Object.values(map);

  if (viewMode === 'juz') {
    return list.filter(item => item.juzNumber === currentJuzNumber).length;
  }
  return list.filter(item => item.surahNumber === currentSurahNumber).length;
}
