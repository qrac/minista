import type { Metadata, LayoutProps } from "minista/types"
import { Head } from "minista/head"

import dataPkg from "minista/package.json"
import dataSite from "../assets/data/site"
import dataMenu from "../assets/data/menu"

import themeSetup from "../utils/theme/setup.js?raw"
import CommonHeader from "../components/common/header"
import CommonSidebar from "../components/common/sidebar"
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
          <section className="section is-main">
            <div className="inner is-px-lg">
              <div className="layout-grid is-docs">
                <div className="layout-column is-sidebar">
                  <div className="layout-content">
                    <CommonSidebar
                      currentUrl={url}
                      itemGroups={menu.docs.items}
                    />
                  </div>
                </div>
                <div className="layout-column is-main">
                  <div className="layout-content">
                    <main className="wysiwyg">{children}</main>
                  </div>
                </div>
                <div className="layout-column is-sidetoc">
                  <div className="layout-content"></div>
                </div>
              </div>
            </div>
          </section>
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
