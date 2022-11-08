import { describe, expect, it } from "vitest"

import { transformHydrate } from "../../src/transform/hydrate"

describe("transformPartial", () => {
  it("Default", () => {
    const result = transformHydrate({
      originalId: "/test/module.js",
      dataAttr: `data-partial-hydration="ph-1"`,
      useLegacy: false,
      useIntersectionObserver: true,
      options: {
        root: null,
        rootMargin: "0px",
        thresholds: [0],
      },
    })

    //console.log(result)
    expect(result).toEqual(
      `import * as ReactDOM from "react-dom/client"
import App from "/test/module.js"
const targets = document.querySelectorAll('[data-partial-hydration="ph-1"]')
if (targets) {
  targets.forEach(target => {
    let children = target.innerHTML
    children = children.replace(/((?<=\\>)(\\s|\\n)*(\\s|\\n))|((\\s|\\n)*(\\s|\\n)(?=\\<))/g, "")
    target.innerHTML = children
    const options = {
      root: null,
      rootMargin: "0px",
      thresholds: [0],
    }
    const observer = new IntersectionObserver(hydrate, options)
    observer.observe(target)
    function hydrate() {
      ReactDOM.hydrateRoot(target, <App />)
      observer.unobserve(target)
    }
  })
}`
    )
  })

  it("useLegacy", () => {
    const result = transformHydrate({
      originalId: "/test/module.js",
      dataAttr: `data-partial-hydration="ph-1"`,
      useLegacy: true,
      useIntersectionObserver: true,
      options: {
        root: null,
        rootMargin: "0px",
        thresholds: [0],
      },
    })

    //console.log(result)
    expect(result).toEqual(
      `import * as ReactDOM from "react-dom/client"
import App from "/test/module.js"
const targets = document.querySelectorAll('[data-partial-hydration="ph-1"]')
if (targets) {
  targets.forEach(target => {
    let children = target.innerHTML
    children = children.replace(/((?<=\\>)(\\s|\\n)*(\\s|\\n))|((\\s|\\n)*(\\s|\\n)(?=\\<))/g, "")
    target.innerHTML = children
    const options = {
      root: null,
      rootMargin: "0px",
      thresholds: [0],
    }
    const observer = new IntersectionObserver(hydrate, options)
    observer.observe(target)
    function hydrate() {
      ReactDOM.hydrate(<App />, target)
      observer.unobserve(target)
    }
  })
}`
    )
  })

  it("Not useIntersectionObserver", () => {
    const result = transformHydrate({
      originalId: "/test/module.js",
      dataAttr: `data-partial-hydration="ph-1"`,
      useLegacy: false,
      useIntersectionObserver: false,
      options: {
        root: null,
        rootMargin: "0px",
        thresholds: [0],
      },
    })

    //console.log(result)
    expect(result).toEqual(
      `import * as ReactDOM from "react-dom/client"
import App from "/test/module.js"
const targets = document.querySelectorAll('[data-partial-hydration="ph-1"]')
if (targets) {
  targets.forEach(target => {
    let children = target.innerHTML
    children = children.replace(/((?<=\\>)(\\s|\\n)*(\\s|\\n))|((\\s|\\n)*(\\s|\\n)(?=\\<))/g, "")
    target.innerHTML = children
    ReactDOM.hydrateRoot(target, <App />)
  })
}`
    )
  })
})
