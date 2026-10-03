// Progressive Web App (PWA) Registration & Install Prompt Handler

let deferredInstallPrompt = null;

export function registerPwa() {
  if (typeof window === 'undefined') return;

  // 1. In development, proactively unregister any service worker and clear caches to prevent Vite module interception
  if (import.meta.env.DEV) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
    }
    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => caches.delete(key));
      });
    }
    return;
  }

  // 2. Register Service Worker in production
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // Check for service worker updates
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('New Quran Memorizer update available.');
                }
              });
            }
          });
        })
        .catch((error) => {
          console.warn('ServiceWorker registration skipped or failed:', error);
        });
    });
  }

  // 2. Capture 'beforeinstallprompt' event for custom 1-click install button
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the default mini-infobar on mobile Chrome
    e.preventDefault();
    deferredInstallPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa-can-install', { detail: true }));
  });

  // 3. Listen for app installed event
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    window.dispatchEvent(new CustomEvent('pwa-can-install', { detail: false }));
    console.log('Quran Memorizer PWA was successfully installed on device!');
  });
}

// Trigger installation prompt
export async function promptPwaInstall() {
  if (!deferredInstallPrompt) {
    return false;
  }
  deferredInstallPrompt.prompt();
  const choice = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  window.dispatchEvent(new CustomEvent('pwa-can-install', { detail: false }));
  return choice.outcome === 'accepted';
}

// Check if currently running as installed standalone app
export function isPwaInstalled() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );
}
