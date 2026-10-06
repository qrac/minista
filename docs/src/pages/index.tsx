import type { Metadata, PageProps } from "minista/types"

import PageHomeHero from "../components/page/home/hero"
import PageHomeTagline from "../components/page/home/tagline"
import PageHomeFeatures from "../components/page/home/features"

import { localizeName, localizePath } from "../components/utils/i18n"

export const metadata: Metadata = {}

export default function (props: PageProps) {
  const { locale, pjt } = props
  const { hero, tagline, features } = pjt.home
  const locales = pjt.i18n.locales
  return (
    <>
      <PageHomeHero
        description={hero.description[locale]}
        license={pjt.site.software.license}
        repositoryUrl={pjt.site.software.repository}
        actions={hero.actions.map((action) => ({
          name: localizeName(action.name, locale),
          url: localizePath(action.url, locale, locales),
          variant: action.variant,
        }))}
      />
      <PageHomeTagline
        heading={tagline.heading[locale]}
        texts={tagline.texts[locale]}
        note={tagline.note}
      />
      <PageHomeFeatures
        heading={features.heading[locale]}
        items={features.items.map((item) => ({
          id: item.id,
          tabletColumn: item.tabletColumn,
          href: localizePath(item.url, locale, locales),
          title: localizeName(item.title, locale),
          description: localizeName(item.description, locale),
        }))}
      />
    </>
  )
}
