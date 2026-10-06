// @ts-check
import { createElement, Fragment, isValidElement } from "react"
import { serializeIslandProps } from "./props.js"

const adapter = { createElement, fragment: Fragment, isElement: isValidElement }

/**
 * Render-local boundary: no global registry, secondary render, or page data evaluation.
 * @param {{element: import("react").ReactElement, components: any[], options: import("./types.js").PluginOptions, snippet: string, directive: string, parameters: any, fallback: import("react").ReactNode}} input
 */
export function IslandBoundary({ element, components, options, snippet, directive, parameters, fallback }) {
  const prefix = options.rootAttrName ? `${options.rootAttrName}-` : ""
  const attr = `data-${prefix}client-`
  const props = serializeIslandProps(element.props, components, adapter)
  if (parameters && typeof parameters === "object") {
    // Reject cycles and unsupported option values before JSON can silently drop
    // them or throw an unstructured error.
    serializeIslandProps({ directiveParameters: parameters }, [], adapter)
  }
  return createElement(options.rootDOMElement, {
    style: options.rootStyle,
    [`${attr}snippet`]: snippet,
    [`${attr}directive`]: directive,
    [`${attr}directive-params`]: typeof parameters === "string" ? parameters :
      parameters && typeof parameters === "object" ? JSON.stringify(parameters) : "",
    // The renderer escapes attribute text. Never concatenate props into HTML/code.
    [`${attr}props`]: props,
  }, directive === "only" ? fallback : element)
}
