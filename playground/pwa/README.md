# Minista PWA playground

This example saves static HTML, CSS, JavaScript, and images for offline use. It uses `pluginPwa()` with the optional `vite-plugin-pwa` peer. No client React runtime is required.

`registerType: "autoUpdate"` is paired with `registerSW()` from `virtual:pwa-register` in the client script. When an updated service worker activates, the page reloads automatically. `onOfflineReady` reports the initial cache installation; an existing active worker is reported separately from a new update.

```sh
npm run play-build:pwa
npm run play-preview:pwa
```

Open the preview URL in a fresh browser profile, wait for the offline-ready message, then disconnect the network. Open About for the first time, reload it, and return Home. The pages, styles, and icons should remain available.

`npm run play:pwa` runs normal SSG development without a service worker. Use production preview to test caching. HTTPS is required when hosted; localhost is allowed for development.

To test updates, keep the preview page open, change text in Home and About, and rebuild. Trigger an update check by reopening the site in another tab, or call `registration.update()` from browser developer tools. Once the new worker activates, the original page should reload with the new text. Disconnect and open About to check that its updated HTML was also saved. Browser update checks are asynchronous; rebuilding alone does not notify an already open page.

Chrome verification: offline navigation to an unvisited page, reload, home navigation, CSS, images, and automatic reload after a version update. Mobile installation and updates have not been tested. Browser storage can be cleared or evicted.
