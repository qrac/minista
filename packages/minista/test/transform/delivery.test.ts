import { describe, expect, it } from "vitest"

import { transformDelivery } from "../../src/transform/delivery"
import { resolveConfig } from "../../src/config"

describe("transformSearch", () => {
  it("Default", async () => {
    const config = await resolveConfig({})
    const result = transformDelivery({
      ssgPages: [
        {
          fileName: "",
          path: "/about",
          title: "ABOUT",
          html: "",
        },
        {
          fileName: "",
          path: "/",
          title: "",
          html: "<title>HOME</title>",
        },
        {
          fileName: "",
          path: "/404",
          title: "404",
          html: "",
        },
      ],
      config,
    })

    //console.log(result)
    expect(result).toEqual([
      {
        title: "HOME",
        path: "/",
      },
      {
        title: "ABOUT",
        path: "/about",
      },
    ])
  })

  it("Sort by title", async () => {
    const config = await resolveConfig({ delivery: { sortBy: "title" } })
    const result = transformDelivery({
      ssgPages: [
        {
          fileName: "",
          path: "/about",
          title: "ABOUT",
          html: "",
        },
        {
          fileName: "",
          path: "/",
          title: "",
          html: "<title>HOME</title>",
        },
        {
          fileName: "",
          path: "/404",
          title: "404",
          html: "",
        },
      ],
      config,
    })

    //console.log(result)
    expect(result).toEqual([
      {
        title: "ABOUT",
        path: "/about",
      },
      {
        title: "HOME",
        path: "/",
      },
    ])
  })
})
