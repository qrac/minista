import { useState } from "react"

import "./toggle.css"

export default function () {
  const [toggle, setToggle] = useState(false)
  return (
    <div className="toggle">
      <h3 className="toggle-title">Block Toggle</h3>
      <div className="toggle-box">
        <button
          className="toggle-button"
          onClick={() => setToggle(!toggle)}
          type="button"
        >
          toggle
        </button>
        <p className="toggle-message">
          {toggle ? (
            <span className="toggle-message-text is-on">on</span>
          ) : (
            <span className="toggle-message-text is-off">off</span>
          )}
        </p>
      </div>
    </div>
  )
}
