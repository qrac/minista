import type { Metadata, PageProps } from "minista/types"

import PageLegacyHero from "../../components/page/legacy/hero"
import PageLegacyTagline from "../../components/page/legacy/tagline"
import PageLegacyFeatures from "../../components/page/legacy/features"

export const metadata: Metadata = { locale: "ja" }

export default function (props: PageProps) {
  const { locale, pjt } = props
  return (
    <>
      <PageLegacyHero />
      <PageLegacyTagline />
      <PageLegacyFeatures />
    </>
  )
}
