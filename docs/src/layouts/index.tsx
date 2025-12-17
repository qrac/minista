import type { Metadata, LayoutProps } from "minista/types"
import { Head } from "minista/head"

import dataPkg from "minista/package.json"
import dataSite from "../assets/data/site"
import dataMenu from "../assets/data/menu"

import themeSetup from "../utils/theme/setup.js?raw"
import CommonHeader from "../components/common/header"
import CommonFooter from "../components/common/footer"

export const metadata: Metadata = {
  pkg: dataPkg,
  site: dataSite,
  menu: dataMenu,
}

export default function (props: LayoutProps) {
  const { url, title, children, layout, noindex, pkg, site, menu } = props
  const isDocs = layout === "docs"
  const siteName = site.name
  const siteDesc = site.description
  const siteUrl = site.url
  const pageTitle = url === "/" ? siteName : `${title} - ${siteName}`
  const ogUrl = siteUrl + url
  const ogImage = siteUrl + site.ogp
  const ogType = url === "/" ? "website" : "article"
  const xCard = site.x.card
  const xId = "@" + site.x.id
  const appleTouchIcon = site.appleTouchIcon
  const favicon = site.favicon
  return (
    <>
      <Head bodyAttributes={{ class: "layout" }}>
        <title>{pageTitle}</title>
        <meta name="description" content={siteDesc} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={siteDesc} />
        <meta property="og:url" content={ogUrl} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:site_name" content={siteName} />
        <meta property="og:type" content={ogType} />
        <meta name="twitter:card" content={xCard} />
        <meta name="twitter:creator" content={xId} />
        {noindex && <meta name="robots" content="noindex" />}
        <link rel="apple-touch-icon" href={appleTouchIcon} />
        <link rel="icon" href={favicon} />
        <link rel="stylesheet" href="/src/assets/styles.css" />
        <script type="module" src="/src/assets/scripts.ts" />
      </Head>
      <CommonHeader
        isSticky={isDocs}
        currentVersion={pkg.version.replace(/-.*/, "")}
        versionItems={menu.version.items}
        mainItems={menu.main.items}
      />
      {isDocs ? (
        <>
          <div className="box is-flex is-gap-xxl">
            <aside className="box is-flex-none is-none desktop:is-block"></aside>
            <main className="box is-flex-0">
              <div className="wysiwyg">{children}</div>
            </main>
            <aside className="box is-flex-none is-none wide:is-block"></aside>
          </div>
        </>
      ) : (
        <>
          <main className="section is-main">{children}</main>
        </>
      )}
      <CommonFooter
        license={pkg.license}
        repositoryUrl={pkg.repository.url}
        xId={site.x.id}
        xName={site.x.name}
        copyrightStartYear={site.copyright.startYear}
        copyrightUrl={site.copyright.url}
        copyrightName={site.copyright.name}
      />
      <script dangerouslySetInnerHTML={{ __html: themeSetup }} />
    </>
  )
}
