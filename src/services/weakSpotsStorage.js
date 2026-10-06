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
 * Get all weak spots as a sorted array
 * Default sort: mistakeCount DESC, lastMarked DESC
 * @returns {Array<Object>}
 */
export function getWeakSpots() {
  const map = getWeakSpotsMap();
  const list = Object.values(map);
  return list.sort((a, b) => {
    if (b.mistakeCount !== a.mistakeCount) {
      return b.mistakeCount - a.mistakeCount;
    }
    return new Date(b.lastMarked) - new Date(a.lastMarked);
  });
}

/**
 * Get mistake count for a specific Ayah
 * @param {number} surahNumber
 * @param {number} numberInSurah
 * @returns {number}
 */
export function getMistakeCount(surahNumber, numberInSurah) {
  if (!surahNumber || !numberInSurah) return 0;
  const map = getWeakSpotsMap();
  const id = `${surahNumber}:${numberInSurah}`;
  return map[id] ? map[id].mistakeCount : 0;
}

/**
 * Mark a mistake on an Ayah (creates or increments count)
 * @param {Object} ayah - Ayah object with surahNumber, numberInSurah, text, translation, juz, ruku
 * @param {Object} [surahMeta] - Surah metadata object with englishName, name, etc.
 * @returns {Object} Updated weak spot item
 */
export function markMistake(ayah, surahMeta = null) {
  if (!ayah || !ayah.surahNumber || !ayah.numberInSurah) return null;

  const map = getWeakSpotsMap();
  const id = `${ayah.surahNumber}:${ayah.numberInSurah}`;
  const now = new Date().toISOString();

  const existing = map[id];
  const newCount = existing ? existing.mistakeCount + 1 : 1;

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
    mistakeCount: newCount,
    lastMarked: now,
    createdAt: existing ? existing.createdAt : now
  };

  map[id] = item;
  saveWeakSpotsMap(map);
  return item;
}

/**
 * Decrement mistake count for an Ayah (removes if count becomes 0)
 * @param {number} surahNumber
 * @param {number} numberInSurah
 */
export function decrementMistake(surahNumber, numberInSurah) {
  const map = getWeakSpotsMap();
  const id = `${surahNumber}:${numberInSurah}`;
  if (!map[id]) return;

  if (map[id].mistakeCount <= 1) {
    delete map[id];
  } else {
    map[id].mistakeCount -= 1;
    map[id].lastMarked = new Date().toISOString();
  }
  saveWeakSpotsMap(map);
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
 * Get total count of weak ayahs
 * @returns {number}
 */
export function getWeakSpotsCount() {
  const map = getWeakSpotsMap();
  return Object.keys(map).length;
}
