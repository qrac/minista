import {
  TbReload,
  //TbDevices,
  TbArrowsExchange2,
  TbExternalLink,
  TbHtml,
  //TbLayoutBottombarCollapse,
  //TbLayoutBottombarExpand,
} from "react-icons/tb"

import type { ViewportMap, Viewport } from "../../viewport.js"

export function StoryAppToolbar({
  reloadStory,
  storyType,
  viewports,
  viewport,
  setViewport,
  reverse,
  setReverse,
  storyUrl,
}: {
  reloadStory: () => void
  storyType: string
  viewports: ViewportMap
  viewport: string
  setViewport: (viewport: string) => void
  reverse: boolean
  setReverse: (reverse: boolean) => void
  storyUrl: string
}) {
  const handleChangeViewport = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setViewport(event.target.value)
  }
  const handleToggleReverse = () => {
    setReverse(!reverse)
  }
  return (
    <div className="storyapp-toolbar">
      <div className="storyapp-toolbar-column">
        <div className="storyapp-toolbar-inputs">
          <button
            type="button"
            className="storyapp-toolbar-icon-button"
            onClick={reloadStory}
          >
            <div className="storyapp-toolbar-icon-wrap">
              <TbReload className="storyapp-toolbar-icon" />
            </div>
          </button>
        </div>
        {storyType !== "doc" && (
          <div className="storyapp-toolbar-inputs">
            {/*<div className="storyapp-toolbar-icon-wrap">
              <TbDevices className="storyapp-toolbar-icon" />
            </div>*/}
            <select
              className="storyapp-toolbar-select"
              onChange={handleChangeViewport}
              value={viewport}
            >
              <option value="">Viewport無し</option>
              {Object.entries(viewports).map(
                (item: [key: string, viewport: Viewport]) => (
                  <option key={item[0]} value={item[0]}>
                    {item[1].name}
                  </option>
                )
              )}
            </select>
          </div>
        )}
        {storyType !== "doc" && viewport && (
          <div className="storyapp-toolbar-inputs">
            <p className="storyapp-toolbar-count">
              {(!reverse
                ? viewports[viewport].styles.width
                : viewports[viewport].styles.height
              ).replace("px", "")}
            </p>
            <button
              type="button"
              className="storyapp-toolbar-icon-button"
              onClick={handleToggleReverse}
            >
              <div className="storyapp-toolbar-icon-wrap">
                <TbArrowsExchange2 className="storyapp-toolbar-icon" />
              </div>
            </button>
            <p className="storyapp-toolbar-count">
              {(!reverse
                ? viewports[viewport].styles.height
                : viewports[viewport].styles.width
              ).replace("px", "")}
            </p>
          </div>
        )}
      </div>
      <div className="storyapp-toolbar-column">
        <div className="storyapp-toolbar-toggle-inputs">
          <a
            className="storyapp-toolbar-icon-button"
            href={storyUrl}
            target="_blank"
          >
            <div className="storyapp-toolbar-icon-wrap">
              <TbExternalLink className="storyapp-toolbar-icon" />
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}
