// @ts-check
import { createElement } from "react"
import { createRoot, hydrateRoot } from "react-dom/client"

/**
 * @param {Element} el
 * @param {import("react").ComponentType} Component
 * @param {boolean} only
 */
export function renderIsland(el, Component, only) {
  const children = createElement(Component)
  if (only) createRoot(el).render(children)
  else hydrateRoot(el, children)
}
