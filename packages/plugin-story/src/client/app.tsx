import { useState, useEffect, useRef } from "react"
import queryString from "query-string"

import { UserAppOptions, AppOptions, defaultOptions } from "./option.js"
import { resolveViewportMap } from "./viewport.js"

import { StoryAppLayout } from "./components/layout/index.js"
import { StoryAppHeader } from "./components/header/index.js"
import { StoryAppBrand } from "./components/brand/index.js"
import { StoryAppNav } from "./components/nav/index.js"
import { StoryAppMain } from "./components/main/index.js"
import { StoryAppStage } from "./components/stage/index.js"
import { StoryAppToolbar } from "./components/toolbar/index.js"
import { StoryAppCanvas } from "./components/canvas/index.js"
import { StoryAppIframe } from "./components/iframe/index.js"

export function StoryApp(opts: UserAppOptions) {
  const _opts: AppOptions = { ...defaultOptions, ...opts }
  const { brandTitle, brandUrl, brandImage, brandTarget, navItems, viewports } =
    _opts
  const resolvedViewports = resolveViewportMap(viewports)

  const [mounted, setMounted] = useState(false)

  const [storyUrl, setStoryUrl] = useState("")
  const [storyType, setStoryType] = useState("doc")
  const storyRef = useRef<HTMLIFrameElement>(null)

  const [viewport, setViewport] = useState("")
  const [reverse, setReverse] = useState(false)

  function reloadStory() {
    if (storyRef.current && storyRef.current.contentWindow) {
      storyRef.current.contentWindow.location.reload()
    }
  }
  useEffect(() => {
    if (mounted && storyRef.current) {
      storyRef.current.addEventListener("load", () => {
        let params = queryString.parse(window.location.search)
        params = { ...params, path: storyUrl }

        const newParamString = queryString
          .stringify(params)
          .replace(/%2F/g, "/")
        const newUrl = window.location.pathname + "?" + newParamString
        window.history.pushState({}, "", newUrl)

        const current = navItems.find((item) => item.url === storyUrl)

        if (!current) {
          return
        }
        const currentType = current.type
        const currentViewport = current.viewport || ""

        setStoryType(currentType)

        if (currentViewport === "none") {
          setViewport("")
        } else if (!viewport && currentViewport) {
          setViewport(currentViewport)
        }
      })
    }
  }, [storyUrl])

  useEffect(() => {
    if (mounted) {
      let params = queryString.parse(window.location.search)
      params = {
        ...params,
        type: storyType,
        viewport,
        reverse: String(reverse),
      }
      const newParamString = queryString.stringify(params).replace(/%2F/g, "/")
      const newUrl = window.location.pathname + "?" + newParamString
      window.history.pushState({}, "", newUrl)
    }
  }, [storyType, viewport, reverse])

  useEffect(() => {
    const params = queryString.parse(window.location.search)
    const currentPath = params?.path ? String(params?.path) : navItems[0].url
    const currentType = params?.type ? String(params?.type) : "doc"
    const currentViewport = params?.viewport ? String(params?.viewport) : ""
    const currentReverse = params?.reverse
      ? String(params?.reverse) === "true"
        ? true
        : false
      : false
    setStoryUrl(currentPath)
    setStoryType(currentType)
    setViewport(currentViewport)
    setReverse(currentReverse)
    setMounted(true)
  }, [])
  return (
    <div className="storyapp">
      <StoryAppLayout>
        <StoryAppHeader>
          <StoryAppBrand
            brandTitle={brandTitle}
            brandImage={brandImage}
            brandUrl={brandUrl}
            brandTarget={brandTarget}
          />
          <StoryAppNav
            storyUrl={storyUrl}
            navItems={navItems}
            onLinkClick={setStoryUrl}
          />
        </StoryAppHeader>
        <StoryAppMain>
          <StoryAppStage>
            <StoryAppToolbar
              reloadStory={reloadStory}
              storyType={storyType}
              viewports={resolvedViewports}
              viewport={viewport}
              setViewport={setViewport}
              reverse={reverse}
              setReverse={setReverse}
              storyUrl={storyUrl}
            />
            <StoryAppCanvas>
              {storyUrl && (
                <StoryAppIframe
                  storyType={storyType}
                  src={storyUrl}
                  forwardedRef={storyRef}
                  viewports={resolvedViewports}
                  viewport={viewport}
                  reverse={reverse}
                />
              )}
            </StoryAppCanvas>
          </StoryAppStage>
        </StoryAppMain>
      </StoryAppLayout>
    </div>
  )
}
