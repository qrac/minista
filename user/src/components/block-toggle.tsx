import { spawn } from "child_process"
import { useState } from "react"

import "./block-toggle.css"

type BlockToggleProps = {
  title?: string
}

const BlockToggle = ({ title }: BlockToggleProps) => {
  const [toggle, setToggle] = useState(false)
  return (
    <div className="block-toggle">
      <h3 className="block-toggle-title">{title}</h3>
      <div className="block-toggle-box">
        <button
          className="block-toggle-button"
          onClick={() => setToggle(!toggle)}
          type="button"
        >
          toggle
        </button>
        <p className="block-toggle-message">
          {toggle ? (
            <span className="block-toggle-message-text is-on">on</span>
          ) : (
            <span className="block-toggle-message-text is-off">off</span>
          )}
        </p>
      </div>
    </div>
  )
}

export default BlockToggle
