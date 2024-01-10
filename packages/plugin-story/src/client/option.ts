import type { ViewportMap } from "./viewport.js"

export type NavItem = {
  category: string
  label: string
  url: string
  type: "doc" | "story"
  viewport?: string
}

export type UserAppOptions = {
  brandTitle?: string
  brandUrl?: string
  brandImage?: string
  brandTarget?: "_self" | "_blank"
  navItems?: NavItem[]
  viewports?: string[] | ViewportMap
}

export type AppOptions = {
  brandTitle: string
  brandUrl: string
  brandImage: string
  brandTarget: "_self" | "_blank"
  navItems: NavItem[]
  viewports: string[] | ViewportMap
}

export const defaultOptions: AppOptions = {
  brandTitle: "StoryApp",
  brandUrl: "",
  brandImage: "",
  brandTarget: "_self",
  navItems: [],
  viewports: ["iphonese2", "iphone12", "iphone12promax", "ipad"],
}
