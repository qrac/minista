import type { GlobalProps } from "minista"
import { Head } from "minista"
//import "highlight.js/styles/base16/dracula.css"
//import "highlight.js/styles/nord.css"
//import "highlight.js/styles/github-dark-dimmed.css"
//import "@fontsource/montserrat/800.css"
//import "@fontsource/jetbrains-mono/400.css"

//import "../assets/css/theme-variable.css"
//import "../assets/css/theme-reset.css"
import site from "../assets/data/site.json"
import AppLayout from "../components/app-layout"
import DocsLayout from "../components/docs-layout"

type CustomGrobalProps = GlobalProps & { layout?: string; noindex?: boolean }

export default function ({
  location,
  title,
  layout,
  noindex,
  children,
}: CustomGrobalProps) {
  const siteTitle = site.title
  const siteDescription = site.description
  const siteUrl = site.url
  const pageTitle =
    location.pathname === "/" ? siteTitle : title + " - " + siteTitle
  const ogUrl = siteUrl + location.pathname
  const ogImage = siteUrl + "/assets/images/ogp.png"
  const ogType = location.pathname === "/" ? "website" : "article"
  const twitterCard = "summary_large_image"
  const twitterId = "@" + site.twitter.id
  const isNoindex = noindex || false
  const appleTouchIcon = "/assets/images/apple-touch-icon.png"
  const favicon = "/assets/images/favicon.png"
  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={siteDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={siteDescription} />
        <meta property="og:url" content={ogUrl} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:site_name" content={siteTitle} />
        <meta property="og:type" content={ogType} />
        <meta name="twitter:card" content={twitterCard} />
        <meta name="twitter:creator" content={twitterId} />
        {isNoindex && <meta name="robots" content="noindex" />}
        <link rel="stylesheet" href="/src/assets/css/entry.css" />
        <link rel="preconnect" href="https://fonts.gstatic.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          rel="preload"
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@800&display=swap"
          as="style"
          //@ts-ignore
          onLoad="this.onload=null;this.rel='stylesheet'"
        />
        <link
          rel="preload"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono&display=swap"
          as="style"
          //@ts-ignore
          onLoad="this.onload=null;this.rel='stylesheet'"
        />
        <link rel="apple-touch-icon" href={appleTouchIcon} />
        <link rel="icon" href={favicon} />
      </Head>
      <AppLayout>
        {layout === "docs" ? (
          <DocsLayout pathname={location.pathname} title={title}>
            {children}
          </DocsLayout>
        ) : (
          <>{children}</>
        )}
      </AppLayout>
    </>
  )
}
