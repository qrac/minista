import type { GlobalProps } from "minista"
import { Head } from "minista"

export default function ({ children }: GlobalProps) {
  return (
    <>
      <Head>
        <link rel="stylesheet" href="/src/assets/index.css" />
      </Head>
      {children}
    </>
  )
}
