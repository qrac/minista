import { compileGlobalFetch } from "../compile/fetch.js"

export type Global = {
  component?: new () => React.Component<any, any>
  getStaticData?: GlobalFetch
}

type Globals = Global[]
type ImportedGlobals = {
  [key: string]: {
    default?: new () => React.Component<any, any>
    getStaticData?: GlobalFetch
  }
}

export type GlobalFetch = () => Promise<GlobalStaticData>
type GlobalStaticData = {
  props: {}
}

export type ResolvedGlobal = {
  component?: new () => React.Component<any, any>
  staticData: GlobalStaticData
}

export function getGlobal(): Global {
  const GLOBALS: ImportedGlobals = import.meta.glob(
    [
      "/src/pages/_global.{tsx,jsx}",
      "/src/_global.{tsx,jsx}",
      "/src/global.{tsx,jsx}",
      "/src/root.{tsx,jsx}",
    ],
    {
      eager: true,
    }
  )
  const globals: Globals =
    Object.keys(GLOBALS).length === 0
      ? [{}]
      : Object.keys(GLOBALS).map((global) => {
          return {
            component: GLOBALS[global].default || undefined,
            getStaticData: GLOBALS[global].getStaticData || undefined,
          }
        })
  const global: Global = globals[0]
  return global
}

export async function getGlobalStaticData(getStaticData: GlobalFetch) {
  const compiledGlobalFetch = await compileGlobalFetch(getStaticData)
  return await compiledGlobalFetch()
}

export async function resolveGlobal(global: Global): Promise<ResolvedGlobal> {
  const resolvedGlobal = {
    component: global.component || undefined,
    staticData: global.getStaticData
      ? await getGlobalStaticData(global.getStaticData)
      : { props: {} },
  }
  return resolvedGlobal
}
