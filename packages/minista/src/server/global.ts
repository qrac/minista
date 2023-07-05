import type {
  GetStaticData,
  StaticData,
  PageProps,
  Metadata,
} from "../shared/index.js"

type GlobalComponent = () => React.CElement<
  { [key: string]: any },
  React.Component<PageProps, {}, any>
>

type ImportedGlobals = {
  [key: string]: {
    default?: GlobalComponent
    getStaticData?: GetStaticData
    metadata?: Metadata
  }
}

type Global = {
  component?: GlobalComponent
  getStaticData?: GetStaticData
  metadata?: Metadata
}

export type ResolvedGlobal = {
  component?: GlobalComponent
  staticData: StaticData
  metadata: Metadata
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
  const globals: Global[] =
    Object.keys(GLOBALS).length === 0
      ? [{}]
      : Object.keys(GLOBALS).map((global) => {
          return {
            component: GLOBALS[global].default || undefined,
            getStaticData: GLOBALS[global].getStaticData || undefined,
            metadata: GLOBALS[global].metadata || {},
          }
        })
  const global: Global = globals[0]
  return global
}

export async function resolveGlobal(global: Global): Promise<ResolvedGlobal> {
  let staticData = global.getStaticData
    ? await global.getStaticData()
    : { props: {} }
  if (Array.isArray(staticData)) {
    staticData = staticData[0]
  }
  const resolvedGlobal = {
    component: global.component || undefined,
    staticData,
    metadata: { ...(global.metadata || {}) },
  }
  return resolvedGlobal
}
