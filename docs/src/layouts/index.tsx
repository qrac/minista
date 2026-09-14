import type { Metadata, LayoutProps } from "minista/types"

import pkg from "minista/package.json"
import pjt from "../../project.json"
import themeSetup from "../assets/js/theme/setup.js?raw"

import CommonHeader from "../components/common/header"
import CommonSidebar from "../components/common/sidebar"
import CommonDocs from "../components/common/docs"
import CommonSidetoc from "../components/common/sidetoc"
import CommonFooter from "../components/common/footer"
import CommonMenu from "../components/common/menu"
import ElementSpacer from "../components/element/spacer"
import ElementPager from "../components/element/pager"
import { formatDesc } from "../components/utils/text"
import { formatPager } from "../components/utils/pager"

export const metadata: Metadata = {
  locale: "en",
  pkg,
  pjt,
}

export default function (props: LayoutProps) {
  const {
    url,
    title,
    children,
    locale,
    layout,
    description,
    hasPrev,
    hasNext,
    noindex,
    pkg,
    pjt,
  } = props

  const isDocs = layout === "docs"
  const hasPager = hasPrev || hasNext
  const siteName = pjt.site.name
  const siteUrl = pjt.site.url
  const pageTitle = ["/", "/ja/"].includes(url)
    ? `${siteName} - ${pjt.home.hero.title[locale]}`
    : `${title} - ${siteName}`
  const pageDesc = description
    ? formatDesc(description)
    : pjt.site.description[locale]
  const { prevTitle, prevUrl, nextTitle, nextUrl } = formatPager(
    url,
    locale,
    pjt.i18n.locales,
    pjt.navigation.docs,
  )
  const ogUrl = siteUrl + url
  const ogImage = siteUrl + pjt.site.assets.ogp
  const ogType = url === "/" ? "website" : "article"
  const xCard = pjt.site.social.x.card
  const xId = "@" + pjt.site.social.x.id
  const appleTouchIcon = pjt.site.assets.appleTouchIcon
  const favicon = pjt.site.assets.favicon

  return (
    <html lang={locale}>
      <head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
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
      </head>
      <body className="layout">
        <CommonHeader
          url={url}
          locale={locale}
          locales={pjt.i18n.locales}
          currentVersion={pkg.version.replace(/-.*/, "")}
          archiveItems={pjt.navigation.versions.archives}
          mainItems={pjt.navigation.main.items}
        />
        {isDocs ? (
          <>
            <section className="section is-main">
              <div className="inner is-px-lg">
                <div className="layout-grid is-docs">
                  <div className="layout-column is-sidebar">
                    <aside className="layout-content">
                      <CommonSidebar
                        url={url}
                        locale={locale}
                        locales={pjt.i18n.locales}
                        navDocsGroups={pjt.navigation.docs.groups}
                      />
                    </aside>
                  </div>
                  <div className="layout-column is-main">
                    <main className="layout-content">
                      <CommonDocs
                        DOMElement="article"
                        isSidetocTarget={true}
                        hasSearch={true}
                      >
                        {children}
                      </CommonDocs>
                      {hasPager && (
                        <>
                          <ElementSpacer height={40} />
                          <ElementPager
                            prevTitle={prevTitle}
                            prevUrl={prevUrl}
                            nextTitle={nextTitle}
                            nextUrl={nextUrl}
                          />
                        </>
                      )}
                    </main>
                  </div>
                  <div className="layout-column is-sidetoc">
                    <aside className="layout-content">
                      <CommonSidetoc />
                    </aside>
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
          xId={pjt.site.social.x.id}
          xName={pjt.site.social.x.name}
          copyrightSince={pjt.site.copyright.since}
          copyrightUrl={pjt.site.copyright.url}
          copyrightHolder={pjt.site.copyright.holder}
        />
        <CommonMenu
          url={url}
          locale={locale}
          locales={pjt.i18n.locales}
          navMain={pjt.navigation.main}
          navDocsGroups={pjt.navigation.docs.groups}
        />
        <script dangerouslySetInnerHTML={{ __html: themeSetup }} />
      </body>
    </html>
  )
}
