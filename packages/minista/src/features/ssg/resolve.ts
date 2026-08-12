import type { DiagnosticCollector } from "../../core/diagnostics/index.js"
import {
  createNodeId,
  type PageNode,
  type RouteNode,
} from "../../core/graph/index.js"
import type { PageModule, StaticData } from "./types.js"

function resolveUrl(
  route: RouteNode,
  paths: Readonly<Record<string, string | number>>,
  diagnostics: DiagnosticCollector,
): string | undefined {
  const missing = route.params.filter(
    (param) => !param.optional && !Object.hasOwn(paths, param.name),
  )
  if (missing.length > 0) {
    diagnostics.error({
      code: "MINISTA_ROUTE_MISSING_PARAM",
      message: `Route ${route.pattern} is missing parameter values: ${missing.map(({ name }) => name).join(", ")}.`,
      hint: "Return every dynamic route parameter from getStaticData().paths.",
      location: { file: route.sourceFile },
      phase: "resolve",
      nodeId: route.id,
    })
    return undefined
  }

  let url = route.pattern
  for (const param of route.params) {
    const value = paths[param.name]
    if (value === undefined) continue
    url = param.rest
      ? url.replace("*", String(value).replace(/^\/+|\/+$/g, ""))
      : url.replaceAll(`:${param.name}`, encodeURIComponent(String(value)))
  }
  return url
}

function normalizeStaticData(data: StaticData | null | undefined): StaticData {
  return {
    paths: data?.paths ?? {},
    props: data?.props ?? {},
  }
}

export async function resolvePageNodes(
  route: RouteNode,
  pageModule: PageModule,
  diagnostics: DiagnosticCollector,
): Promise<readonly PageNode[]> {
  let rawData: StaticData | readonly StaticData[] | null | undefined
  try {
    rawData = pageModule.getStaticData
      ? await pageModule.getStaticData()
      : undefined
  } catch (error) {
    diagnostics.error({
      code: "MINISTA_STATIC_DATA_FAILED",
      message: error instanceof Error ? error.message : String(error),
      hint: "Check getStaticData() and the external data it reads.",
      location: { file: route.sourceFile },
      phase: "resolve",
      nodeId: route.id,
    })
    return Object.freeze([])
  }

  const entries = Array.isArray(rawData) ? rawData : [rawData]
  const pages: PageNode[] = []
  for (const entry of entries) {
    const staticData = normalizeStaticData(entry)
    const url = resolveUrl(route, staticData.paths ?? {}, diagnostics)
    if (!url) continue
    const params = Object.fromEntries(
      Object.entries(staticData.paths ?? {}).map(([key, value]) => [
        key,
        String(value),
      ]),
    )
    pages.push(
      Object.freeze({
        id: createNodeId("page", route.id, url),
        routeId: route.id,
        url,
        params: Object.freeze(params),
        props: Object.freeze({ ...(staticData.props ?? {}) }),
        metadata: Object.freeze({ ...(pageModule.metadata ?? {}) }),
        draft: pageModule.metadata?.draft === true,
      }),
    )
  }
  return Object.freeze(pages)
}
