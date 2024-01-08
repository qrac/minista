import type {
  ImportedLayouts,
  FormatedLayout,
  ResolvedLayout,
} from "../@types/node.js"

export function formatLayout(LAYOUTS: ImportedLayouts): FormatedLayout {
  const formatedLayouts: FormatedLayout[] =
    Object.keys(LAYOUTS).length === 0
      ? [{}]
      : Object.keys(LAYOUTS).map((layout) => {
          return {
            component: LAYOUTS[layout].default || undefined,
            getStaticData: LAYOUTS[layout].getStaticData || undefined,
            metadata: LAYOUTS[layout].metadata || {},
          }
        })
  return formatedLayouts[0]
}

export async function resolveLayout(
  layout: FormatedLayout
): Promise<ResolvedLayout> {
  let staticData = layout.getStaticData
    ? await layout.getStaticData()
    : { props: {} }
  if (Array.isArray(staticData)) {
    staticData = staticData[0]
  }
  return {
    component: layout.component || undefined,
    staticData,
    metadata: { ...(layout.metadata || {}) },
  }
}
