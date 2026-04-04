/** @typedef {import('../types').ImportedLayouts} ImportedLayouts */
/** @typedef {import('../types').FormatedLayout} FormatedLayout */
/** @typedef {import('../types').ResolvedLayout} ResolvedLayout */

/**
 * @param {ImportedLayouts} LAYOUTS
 * @returns {FormatedLayout}
 */
export function formatLayout(LAYOUTS) {
  if (Object.keys(LAYOUTS).length === 0) return {}

  return Object.keys(LAYOUTS).map((key) => ({
    component: LAYOUTS[key].default,
    getStaticData: LAYOUTS[key].getStaticData,
    metadata: LAYOUTS[key].metadata ?? {},
  }))[0]
}

/**
 * @param {FormatedLayout} layout
 * @returns {Promise<ResolvedLayout>}
 */
export async function resolveLayout(layout) {
  let staticData = layout.getStaticData
    ? await layout.getStaticData()
    : { props: {} }
  if (Array.isArray(staticData)) {
    staticData = staticData[0]
  }
  return {
    component: layout.component,
    staticData,
    metadata: layout.metadata ?? {},
  }
}
