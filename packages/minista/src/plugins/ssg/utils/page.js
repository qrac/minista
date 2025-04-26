/** @typedef {import('../types').PluginOptions} PluginOptions */
/** @typedef {import('../types').StaticData} StaticData */
/** @typedef {import('../types').ImportedPages} ImportedPages */
/** @typedef {import('../types').FormatedPage} FormatedPage */
/** @typedef {import('../types').ResolvedPage} ResolvedPage */

import { getPageUrl, resolveParamUrl } from "../../../shared/url.js"

/**
 * @param {ImportedPages} PAGES
 * @param {PluginOptions} opts
 * @returns {FormatedPage[]}
 */
export function formatPages(PAGES, opts) {
  return Object.keys(PAGES).map((key) => {
    const pageUrl = getPageUrl(key, opts.srcBases)
    const metadata = PAGES[key].metadata || {}
    return {
      url: pageUrl,
      component: PAGES[key].default,
      getStaticData: PAGES[key].getStaticData,
      metadata,
    }
  })
}

/**
 * @param {FormatedPage} page
 * @param {StaticData} staticData
 * @param {string} [resolvedPageUrl]
 * @returns {ResolvedPage}
 */
function createResolvedPage(page, staticData, resolvedPageUrl = page.url) {
  return {
    url: resolvedPageUrl,
    component: page.component,
    staticData,
    metadata: page.metadata,
  }
}

/**
 * @param {FormatedPage} page
 * @param {StaticData} staticData
 * @returns {ResolvedPage}
 */
function createResolvedPageWithPaths(page, staticData) {
  const mergedStaticData = {
    props: staticData.props ?? {},
    paths: staticData.paths ?? {},
  }
  const resolvedPageUrl = resolveParamUrl(page.url, mergedStaticData.paths)
  return createResolvedPage(page, mergedStaticData, resolvedPageUrl)
}

/**
 * @param {FormatedPage} page
 * @returns {Promise<ResolvedPage|ResolvedPage[]>}
 */
async function resolvePage(page) {
  const staticData = page.getStaticData ? await page.getStaticData() : null

  if (!staticData) return createResolvedPage(page, { props: {} })

  if (Array.isArray(staticData)) {
    return Promise.all(
      staticData.map((entry) => createResolvedPageWithPaths(page, entry))
    )
  }
  if ("paths" in staticData) {
    return createResolvedPageWithPaths(page, staticData)
  }
  return createResolvedPage(page, staticData)
}

/**
 * @param {FormatedPage[]} pages
 * @returns {Promise<ResolvedPage[]>}
 */
export async function resolvePages(pages) {
  const results = await Promise.all(pages.map(resolvePage))
  return results.flat()
}
