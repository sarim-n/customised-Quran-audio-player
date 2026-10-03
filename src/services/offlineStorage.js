// Offline Recitation Storage & Download Manager
// Uses Cache API & Service Worker to provide 100% offline access to Quran text and audio

import { fetchSurah, fetchJuz, getAyahAudioUrl } from './quranApi';
import { SURAHS } from '../data/quranMeta';

export const AUDIO_CACHE_NAME = 'quran-audio-v1';
export const API_CACHE_NAME = 'quran-api-v1';
const INDEX_STORAGE_KEY = 'quran_offline_index_v2';

/**
 * Retrieve the offline downloads manifest from localStorage
 * Format: { [itemKey]: { key, type: 'surah'|'juz', id: number, name: string, count: number, totalBytes: number, reciterId: string, timestamp: number } }
 */
export function getOfflineIndex() {
  try {
    const raw = localStorage.getItem(INDEX_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveOfflineIndex(indexObj) {
  try {
    localStorage.setItem(INDEX_STORAGE_KEY, JSON.stringify(indexObj));
    // Dispatch event so UI components immediately reflect the change
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('quran-offline-index-updated', { detail: indexObj }));
    }
  } catch (err) {
    console.warn('Failed to save offline index:', err);
  }
}

/**
 * Generate a unique manifest key
 */
export function getOfflineKey(type, id, reciterId) {
  return `${type}_${id}_${reciterId || 'ar.alafasy'}`;
}

/**
 * Check if a Surah or Juz is fully downloaded for a given reciter
 */
export function isItemDownloaded(type, id, reciterId) {
  const index = getOfflineIndex();
  const key = getOfflineKey(type, id, reciterId);
  return Boolean(index[key]?.isComplete);
}

/**
 * Get offline cached Blob URL for an audio URL if available
 */
export async function getOfflineAudioBlob(url) {
  if (!url || typeof window === 'undefined' || !('caches' in window)) return null;
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    let cachedResponse = await cache.match(url);
    if (!cachedResponse) {
      cachedResponse = await cache.match(url, { ignoreSearch: true });
    }
    if (cachedResponse) {
      const blob = await cachedResponse.blob();
      return URL.createObjectURL(blob);
    }
  } catch (err) {
    console.warn('Failed to get offline audio blob:', err);
  }
  return null;
}

/**
 * Download an entire Surah (Text + Audio) for offline playback
 * @param {number} surahNumber (1-114)
 * @param {object} reciter { id, name }
 * @param {function} onProgress callback({ current, total, percentage, ayahNumber })
 * @param {AbortSignal} abortSignal optional abort signal
 */
export async function downloadSurah(surahNumber, reciter, onProgress = () => {}, abortSignal = null) {
  if (typeof window === 'undefined' || !('caches' in window)) {
    throw new Error('Offline storage is not supported in this browser.');
  }

  const reciterId = reciter?.id || 'ar.alafasy';
  const manifestKey = getOfflineKey('surah', surahNumber, reciterId);
  const surahMeta = SURAHS.find(s => s.number === surahNumber);
  const surahName = surahMeta?.englishName || `Surah ${surahNumber}`;

  // 1. Fetch & Cache Surah Text (Arabic Uthmani + Translation)
  const surahData = await fetchSurah(surahNumber);
  const ayahs = surahData.ayahs || [];
  if (ayahs.length === 0) {
    throw new Error(`No ayahs found for Surah ${surahNumber}`);
  }

  // Cache text response into API cache
  try {
    const apiCache = await caches.open(API_CACHE_NAME);
    const textUrl = `https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-uthmani,en.sahih`;
    const textRes = await fetch(textUrl);
    if (textRes.ok) {
      await apiCache.put(textUrl, textRes.clone());
    }
  } catch (err) {
    console.warn('Text caching warning:', err);
  }

  // 2. Download all Ayah MP3s into AUDIO_CACHE_NAME
  const audioCache = await caches.open(AUDIO_CACHE_NAME);
  let totalBytes = 0;
  const total = ayahs.length;

  for (let i = 0; i < ayahs.length; i++) {
    if (abortSignal && abortSignal.aborted) {
      throw new Error('Download cancelled by user.');
    }

    const ayah = ayahs[i];
    const audioUrl = getAyahAudioUrl(ayah, reciter);

    // Report progress before each download
    onProgress({
      current: i + 1,
      total,
      percentage: Math.round(((i) / total) * 100),
      ayahNumber: ayah.numberInSurah,
      surahName
    });

    try {
      // Check if already in cache
      const existing = await audioCache.match(audioUrl);
      if (existing) {
        const cl = existing.headers.get('content-length');
        if (cl) totalBytes += parseInt(cl, 10);
      } else {
        const res = await fetch(audioUrl, { signal: abortSignal });
        if (res.ok) {
          const cl = res.headers.get('content-length');
          if (cl) totalBytes += parseInt(cl, 10);
          await audioCache.put(audioUrl, res.clone());
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      }
    } catch (fetchErr) {
      if (abortSignal && abortSignal.aborted) {
        throw new Error('Download cancelled by user.');
      }
      console.warn(`Failed to cache ayah ${ayah.numberInSurah}:`, fetchErr);
    }
  }

  // Final 100% progress update
  onProgress({
    current: total,
    total,
    percentage: 100,
    ayahNumber: ayahs[total - 1]?.numberInSurah,
    surahName
  });

  // 3. Update offline index in localStorage
  const index = getOfflineIndex();
  index[manifestKey] = {
    key: manifestKey,
    type: 'surah',
    id: surahNumber,
    name: surahName,
    arabicName: surahMeta?.name || '',
    count: total,
    totalBytes: totalBytes || total * 150000,
    reciterId,
    reciterName: reciter?.name || 'Reciter',
    isComplete: true,
    timestamp: Date.now()
  };
  saveOfflineIndex(index);

  return { success: true, count: total, totalBytes };
}

/**
 * Download an entire Juz (Text + Audio) for offline playback
 */
export async function downloadJuz(juzNumber, convention = 'indopak', reciter, onProgress = () => {}, abortSignal = null) {
  if (typeof window === 'undefined' || !('caches' in window)) {
    throw new Error('Offline storage is not supported in this browser.');
  }

  const reciterId = reciter?.id || 'ar.alafasy';
  const manifestKey = getOfflineKey('juz', juzNumber, reciterId);
  const juzName = `Juz ${juzNumber}`;

  // 1. Fetch & Cache Juz Text
  const juzData = await fetchJuz(juzNumber, convention);
  const ayahs = juzData.ayahs || [];
  if (ayahs.length === 0) {
    throw new Error(`No ayahs found for Juz ${juzNumber}`);
  }

  try {
    const apiCache = await caches.open(API_CACHE_NAME);
    const arabicUrl = `https://api.alquran.cloud/v1/juz/${juzNumber}/quran-uthmani`;
    const transUrl = `https://api.alquran.cloud/v1/juz/${juzNumber}/en.sahih`;
    const [arRes, trRes] = await Promise.all([
      fetch(arabicUrl).catch(() => null),
      fetch(transUrl).catch(() => null)
    ]);
    if (arRes && arRes.ok) await apiCache.put(arabicUrl, arRes.clone());
    if (trRes && trRes.ok) await apiCache.put(transUrl, trRes.clone());
  } catch (err) {
    console.warn('Juz text caching warning:', err);
  }

  const audioCache = await caches.open(AUDIO_CACHE_NAME);
  let totalBytes = 0;
  const total = ayahs.length;

  for (let i = 0; i < ayahs.length; i++) {
    if (abortSignal && abortSignal.aborted) {
      throw new Error('Download cancelled by user.');
    }

    const ayah = ayahs[i];
    const audioUrl = getAyahAudioUrl(ayah, reciter);

    onProgress({
      current: i + 1,
      total,
      percentage: Math.round(((i) / total) * 100),
      ayahNumber: ayah.numberInSurah,
      juzName
    });

    try {
      const existing = await audioCache.match(audioUrl);
      if (existing) {
        const cl = existing.headers.get('content-length');
        if (cl) totalBytes += parseInt(cl, 10);
      } else {
        const res = await fetch(audioUrl, { signal: abortSignal });
        if (res.ok) {
          const cl = res.headers.get('content-length');
          if (cl) totalBytes += parseInt(cl, 10);
          await audioCache.put(audioUrl, res.clone());
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      }
    } catch (fetchErr) {
      if (abortSignal && abortSignal.aborted) {
        throw new Error('Download cancelled by user.');
      }
      console.warn(`Failed to cache ayah ${ayah.numberInSurah}:`, fetchErr);
    }
  }

  onProgress({
    current: total,
    total,
    percentage: 100,
    ayahNumber: ayahs[total - 1]?.numberInSurah,
    juzName
  });

  const index = getOfflineIndex();
  index[manifestKey] = {
    key: manifestKey,
    type: 'juz',
    id: juzNumber,
    name: juzName,
    count: total,
    totalBytes: totalBytes || total * 150000,
    reciterId,
    reciterName: reciter?.name || 'Reciter',
    isComplete: true,
    timestamp: Date.now()
  };
  saveOfflineIndex(index);

  return { success: true, count: total, totalBytes };
}

/**
 * Download ALL 114 Surahs with a single click for complete offline Quran tilawah
 * @param {object} reciter { id, name }
 * @param {function} onProgress callback
 * @param {AbortSignal} abortSignal optional abort signal
 */
export async function downloadAllSurahs(reciter, onProgress = () => {}, abortSignal = null) {
  const TOTAL_QURAN_AYAHS = 6236;
  let downloadedAyahsCount = 0;
  const reciterId = reciter?.id || 'ar.alafasy';

  for (let sNum = 1; sNum <= 114; sNum++) {
    if (abortSignal && abortSignal.aborted) {
      throw new Error('Download cancelled by user.');
    }

    const sMeta = SURAHS.find(s => s.number === sNum);
    const sName = sMeta?.englishName || `Surah ${sNum}`;
    const key = getOfflineKey('surah', sNum, reciterId);

    // If already complete, add to cumulative count and report
    const index = getOfflineIndex();
    if (index[key]?.isComplete) {
      downloadedAyahsCount += sMeta?.numberOfAyahs || 0;
      onProgress({
        currentSurah: sNum,
        totalSurahs: 114,
        surahName: sName,
        ayahCurrent: sMeta?.numberOfAyahs || 0,
        ayahTotal: sMeta?.numberOfAyahs || 0,
        currentAyahGlobal: downloadedAyahsCount,
        totalAyahsGlobal: TOTAL_QURAN_AYAHS,
        percentage: Math.min(100, Math.round((downloadedAyahsCount / TOTAL_QURAN_AYAHS) * 100))
      });
      continue;
    }

    // Download this Surah
    await downloadSurah(
      sNum,
      reciter,
      (p) => {
        const globalCurrent = downloadedAyahsCount + p.current;
        onProgress({
          currentSurah: sNum,
          totalSurahs: 114,
          surahName: sName,
          ayahCurrent: p.current,
          ayahTotal: p.total,
          currentAyahGlobal: globalCurrent,
          totalAyahsGlobal: TOTAL_QURAN_AYAHS,
          percentage: Math.min(100, Math.round((globalCurrent / TOTAL_QURAN_AYAHS) * 100))
        });
      },
      abortSignal
    );

    downloadedAyahsCount += sMeta?.numberOfAyahs || 0;
  }

  onProgress({
    currentSurah: 114,
    totalSurahs: 114,
    surahName: 'All 114 Surahs Complete',
    ayahCurrent: TOTAL_QURAN_AYAHS,
    ayahTotal: TOTAL_QURAN_AYAHS,
    currentAyahGlobal: TOTAL_QURAN_AYAHS,
    totalAyahsGlobal: TOTAL_QURAN_AYAHS,
    percentage: 100
  });

  return { success: true, count: 114 };
}

/**
 * Delete a downloaded Surah or Juz from offline storage
 */
export async function deleteOfflineItem(manifestKey) {
  const index = getOfflineIndex();
  const item = index[manifestKey];
  if (!item) return;

  try {
    const audioCache = await caches.open(AUDIO_CACHE_NAME);
    const reciter = { id: item.reciterId };

    if (item.type === 'surah') {
      const surahData = await fetchSurah(item.id).catch(() => null);
      if (surahData?.ayahs) {
        for (const ayah of surahData.ayahs) {
          const audioUrl = getAyahAudioUrl(ayah, reciter);
          await audioCache.delete(audioUrl);
        }
      }
    } else if (item.type === 'juz') {
      const juzData = await fetchJuz(item.id).catch(() => null);
      if (juzData?.ayahs) {
        for (const ayah of juzData.ayahs) {
          const audioUrl = getAyahAudioUrl(ayah, reciter);
          await audioCache.delete(audioUrl);
        }
      }
    }
  } catch (err) {
    console.warn('Error clearing audio cache:', err);
  }

  delete index[manifestKey];
  saveOfflineIndex(index);
}

/**
 * Format bytes to readable string (e.g. 15.4 MB)
 */
export function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${mb.toFixed(1)} MB`;
}

/**
 * Estimate storage usage of browser
 */
export async function getStorageEstimate() {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const est = await navigator.storage.estimate();
      return {
        usage: est.usage || 0,
        quota: est.quota || 0,
        usageMb: ((est.usage || 0) / (1024 * 1024)).toFixed(1),
        quotaMb: ((est.quota || 0) / (1024 * 1024)).toFixed(0)
      };
    } catch {}
  }
  return null;
}
