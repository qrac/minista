// @ts-check
import { createElement, Fragment, isValidElement } from "react"
import { createRoot, hydrateRoot } from "react-dom/client"
import { deserializeIslandProps } from "./props.js"

/**
 * @param {Element} el
 * @param {import("react").ComponentType} Component
 * @param {boolean} only
 * @param {string} payload
 * @param {any[]} components
 */
export function renderIsland(el, Component, only, payload, components) {
  const props = deserializeIslandProps(payload, components, {
    createElement, fragment: Fragment, isElement: isValidElement,
  })
  // Keep the existing HTML normalization, after validating the payload so a
  // decode failure leaves the SSR/fallback document untouched.
  el.innerHTML = el.innerHTML.replace(/\>[\r\n ]+/g, ">")
  const children = createElement(Component, props)
  if (only) createRoot(el).render(children)
  else hydrateRoot(el, children)
}
