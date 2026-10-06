import type { Metadata, PageProps } from "minista/types"

import PageHomeHero from "../../components/page/home/hero"
import PageHomeTagline from "../../components/page/home/tagline"
import PageHomeFeatures from "../../components/page/home/features"

export const metadata: Metadata = { locale: "ja" }

export default function (props: PageProps) {
  const { locale } = props
  return (
    <>
      <PageHomeHero />
      <PageHomeTagline />
      <PageHomeFeatures />
    </>
  )
}
