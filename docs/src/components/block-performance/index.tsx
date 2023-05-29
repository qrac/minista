export default function () {
  return (
    <div className="block-performance">
      <div className="block-performance-group">
        <div className="block-performance-row">
          <p className="block-performance-text is-row-head">
            develop: v1-latest
          </p>
          <div className="block-performance-bar is-flex-grow-pattern-1 is-bg-ac-1"></div>
          <p className="block-performance-text is-row-end">9.1715s</p>
        </div>
        <div className="block-performance-comparison is-pattern-1"></div>
        <div className="block-performance-row">
          <p className="block-performance-text is-row-head">develop: v2.0.0</p>
          <div className="block-performance-bar is-flex-grow-pattern-2 is-bg-ac-2"></div>
          <p className="block-performance-text is-row-end is-color-ac-2">
            0.6006s (-93.45%)
          </p>
        </div>
      </div>
      <div className="block-performance-group">
        <div className="block-performance-row">
          <p className="block-performance-text is-row-head">
            develop: v1-latest
          </p>
          <div className="block-performance-bar is-bg-ac-1"></div>
          <p className="block-performance-text is-row-end">10.7899s</p>
        </div>
        <div className="block-performance-comparison is-pattern-2"></div>
        <div className="block-performance-row">
          <p className="block-performance-text is-row-head">develop: v2.0.0</p>
          <div className="block-performance-bar is-flex-grow-pattern-3 is-bg-ac-2"></div>
          <p className="block-performance-text is-row-end is-color-ac-2">
            5.9628s (-44.73%)
          </p>
        </div>
      </div>
      <p className="block-performance-status">
        {"Example: { js: 319KB, css: 101KB, components: 38, pages: 15 }"}
      </p>
    </div>
  )
}
