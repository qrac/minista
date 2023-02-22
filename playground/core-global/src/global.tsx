import type { GlobalProps } from "minista"

export default function ({ title, children }: GlobalProps) {
  return (
    <>
      <header>
        <h1>Site</h1>
        <nav>
          <ul>
            <li>
              <a href="/">Home</a>
            </li>
            <li>
              <a href="/about">About</a>
            </li>
          </ul>
        </nav>
        <h2>Page: {title}</h2>
      </header>
      <main>{children}</main>
    </>
  )
}
