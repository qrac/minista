import type { LayoutProps } from "minista/types"

import "../assets/style.css"

export default function Layout({ children }: LayoutProps) {
  return (
    <html lang="en">
      <head>
        <title>minista PWA playground</title>
        <script type="module" src="/src/assets/status.ts" />
      </head>
      <body>
        <main>
          <header>
            <img src="/icon.svg" width="48" height="48" />
            <h1>minista PWA</h1>
          </header>
          <nav>
            <a href="/">Home</a> · <a href="/about/">About</a>
          </nav>
          {children}
          <p id="offline-status">Preparing offline access…</p>
        </main>
      </body>
    </html>
  )
}
