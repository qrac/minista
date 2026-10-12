/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/vanillajs" />

import { registerSW } from "virtual:pwa-register"

const status = document.getElementById("offline-status")!

if (!import.meta.env.PROD) {
  status.textContent = "Offline caching is available in production preview."
} else if ("serviceWorker" in navigator) {
  registerSW({
    immediate: true,
    onOfflineReady() {
      status.textContent = "Ready for offline use"
    },
    onRegisteredSW(_url, registration) {
      if (registration?.active) {
        status.textContent = "Offline cache is available. Checking for updates…"
      }
    },
    onRegisterError() {
      status.textContent =
        "Could not prepare offline access. Check your connection."
    },
  })
} else {
  status.textContent = "Offline access is not supported in this browser."
}
