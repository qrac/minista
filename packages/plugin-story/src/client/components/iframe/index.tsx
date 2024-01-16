import { useState, useEffect } from "react"

import type { ViewportMap } from "../../viewport.js"

export function StoryAppIframe({
  storyType,
  src,
  forwardedRef,
  viewports,
  viewport,
  reverse,
}: {
  storyType: string
  src: string
  forwardedRef: React.RefObject<HTMLIFrameElement>
  viewports: ViewportMap
  viewport: string
  reverse: boolean
}) {
  const [loadSrc, setLoadSrc] = useState("")
  const [loading, setLoading] = useState(true)
  const hasViewport = storyType !== "doc" && viewport ? true : false

  const width = hasViewport
    ? !reverse
      ? viewports[viewport].styles.width
      : viewports[viewport].styles.height
    : "100%"
  const height = hasViewport
    ? !reverse
      ? viewports[viewport].styles.height
      : viewports[viewport].styles.width
    : "100%"

  function handleLoad() {
    if (loadSrc !== "") setLoading(false)
  }
  useEffect(() => {
    setLoading(true)
    setLoadSrc("")

    setTimeout(() => {
      setLoadSrc(src)
    }, 320)
  }, [src])
  return (
    <>
      <div
        className="storyapp-iframe-loading"
        style={{
          top: hasViewport ? "12px" : "0",
          width,
          height,
          opacity: loading ? 1 : 0,
          visibility: loading ? "visible" : "hidden",
        }}
      >
        {loading && (
          <div className="storyapp-iframe-loading-content is-active-after-seconds">
            <div className="storyapp-iframe-loading-texts">
              <span className="storyapp-iframe-loading-text-main">Loading</span>
              <span className="storyapp-iframe-loading-text-dots">
                <span>.</span>
                <span>..</span>
                <span>...</span>
              </span>
            </div>
          </div>
        )}
      </div>
      <iframe
        className="storyapp-iframe"
        style={{
          top: hasViewport ? "12px" : "0",
          width,
          height,
          //opacity: loading ? 0 : 1,
        }}
        src={loadSrc}
        ref={forwardedRef}
        onLoad={handleLoad}
        loading="lazy"
      />
    </>
  )
}
