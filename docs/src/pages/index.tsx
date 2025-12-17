import type { Metadata, PageProps } from "minista/types"

import PageHomeHero from "../components/page/home/hero"
import PageHomeTagline from "../components/page/home/tagline"

export const metadata: Metadata = {
  layout: "home",
}

export default function (props: PageProps) {
  const { pkg, site } = props
  return (
    <>
      <PageHomeHero
        description={site.description}
        license={pkg.license}
        repositoryUrl={pkg.repository.url}
      />
      <PageHomeTagline />
    </>
  )
}
