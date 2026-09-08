// Module initialization is shared; mutable processing state belongs to each caller.
/** @type {ReturnType<typeof initialize> | undefined} */
let loaded

export function loadDependency() {
  return loaded ??= initialize()
}

function initialize() {
  return import("sharp")
}
