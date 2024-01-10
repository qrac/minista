import { clsx } from "clsx"
import { TbExternalLink } from "react-icons/tb"

export function StoryAppDocsDemo({
  src,
  maxWidth,
  height = "100px",
  useWide,
}: {
  src: string
  maxWidth?: string
  height?: string
  useWide?: boolean
}) {
  return (
    <div className="storyapp-docs-demo">
      <div className={clsx("storyapp-docs-demo-main", useWide && "is-wide")}>
        <div className="storyapp-docs-demo-card">
          <div
            className="storyapp-docs-demo-inner"
            style={{ maxWidth, height }}
          >
            <iframe className="storyapp-docs-demo-iframe" src={src}></iframe>
          </div>
        </div>
      </div>
      <div className="storyapp-docs-demo-sub">
        <a href={src} target="_blank" className="storyapp-docs-demo-link">
          <span className="storyapp-docs-demo-link-text">
            デモを別タブで開く
          </span>
          <TbExternalLink className="storyapp-docs-demo-link-icon" />
        </a>
      </div>
    </div>
  )
}
