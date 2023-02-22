import { describe, expect, it } from "vitest"

import {
  getDeliveryItems,
  getDeliveryGroups,
  getDeliveryTag,
} from "../../src/transform/delivery"
import { resolveConfig } from "../../src/config"

describe("getDeliveryItems", () => {
  it("Default", async () => {
    const config = await resolveConfig({})
    const result = getDeliveryItems({
      ssgPages: [
        {
          fileName: "",
          path: "/about",
          group: "",
          title: "ABOUT",
          html: "",
        },
        {
          fileName: "",
          path: "/",
          group: "",
          title: "",
          html: "<title>HOME</title>",
        },
        {
          fileName: "",
          path: "/404",
          group: "",
          title: "404",
          html: "",
        },
      ],
      config,
    })
    expect(result).toEqual([
      {
        group: "",
        title: "HOME",
        path: "/",
      },
      {
        group: "",
        title: "ABOUT",
        path: "/about",
      },
    ])
  })

  it("Sort by title", async () => {
    const config = await resolveConfig({ delivery: { sortBy: "title" } })
    const result = getDeliveryItems({
      ssgPages: [
        {
          fileName: "",
          path: "/about",
          group: "",
          title: "ABOUT",
          html: "",
        },
        {
          fileName: "",
          path: "/",
          group: "",
          title: "",
          html: "<title>HOME</title>",
        },
        {
          fileName: "",
          path: "/404",
          group: "",
          title: "404",
          html: "",
        },
      ],
      config,
    })
    expect(result).toEqual([
      {
        group: "",
        title: "ABOUT",
        path: "/about",
      },
      {
        group: "",
        title: "HOME",
        path: "/",
      },
    ])
  })
})

describe("getDeliveryGroups", () => {
  it("Blank", () => {
    const result = getDeliveryGroups([])
    expect(result).toEqual([])
  })

  it("No title", () => {
    const result = getDeliveryGroups([
      {
        group: "",
        title: "HOME",
        path: "/",
      },
      {
        group: "",
        title: "ABOUT",
        path: "/about",
      },
    ])
    expect(result).toEqual([
      {
        title: "",
        items: [
          {
            title: "HOME",
            path: "/",
          },
          {
            title: "ABOUT",
            path: "/about",
          },
        ],
      },
    ])
  })

  it("Has title", () => {
    const result = getDeliveryGroups([
      {
        group: "PC",
        title: "HOME",
        path: "/",
      },
      {
        group: "SMP",
        title: "ABOUT",
        path: "/about",
      },
    ])
    expect(result).toEqual([
      {
        title: "PC",
        items: [
          {
            title: "HOME",
            path: "/",
          },
        ],
      },
      {
        title: "SMP",
        items: [
          {
            title: "ABOUT",
            path: "/about",
          },
        ],
      },
    ])
  })
})

describe("getDeliveryTag", () => {
  it("Blank", () => {
    const result = getDeliveryTag({ items: [] })
    expect(result).toEqual("")
  })

  it("Default", () => {
    const result = getDeliveryTag({
      items: [
        {
          title: "HOME",
          path: "/",
        },
        {
          title: "ABOUT",
          path: "/about",
        },
      ],
    })
    expect(result).toEqual(`<nav class="minista-delivery-nav">
<ul class="minista-delivery-list">
<li class="minista-delivery-item">
  <div class="minista-delivery-item-content">
    <a
      class="minista-delivery-item-content-link"
      href="/"
    ></a>
    <div class="minista-delivery-item-content-inner">
      <p class="minista-delivery-item-content-name">HOME</p>
      <p class="minista-delivery-item-content-slug">/</p>
    </div>
    <div class="minista-delivery-item-content-background"></div>
  </div>
</li>
<li class="minista-delivery-item">
  <div class="minista-delivery-item-content">
    <a
      class="minista-delivery-item-content-link"
      href="/about"
    ></a>
    <div class="minista-delivery-item-content-inner">
      <p class="minista-delivery-item-content-name">ABOUT</p>
      <p class="minista-delivery-item-content-slug">/about</p>
    </div>
    <div class="minista-delivery-item-content-background"></div>
  </div>
</li>
</ul>
</nav>`)
  })
})
