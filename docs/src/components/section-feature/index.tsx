import { loadDefaultJapaneseParser } from "budoux"

import {
  main as mainItems,
  lib as libItems,
  sub as subItems,
} from "../../assets/data/feature.json"

export default function () {
  const parser = loadDefaultJapaneseParser()
  return (
    <section className="section-feature" id="section-feature">
      <div className="section-feature-inner">
        <h2 className="section-feature-title">Feature</h2>
        <div className="section-feature-grids">
          <div className="section-feature-grid">
            {mainItems.map((item, index) => (
              <div className="section-feature-card" key={index}>
                <div className="section-feature-card-inner">
                  <h3 className="section-feature-card-title">{item.title}</h3>
                  <p
                    className="section-feature-card-text"
                    dangerouslySetInnerHTML={{
                      __html: parser.translateHTMLString(item.text),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="section-feature-grid">
            {libItems.map((item, index) => (
              <div className="section-feature-card" key={index}>
                <div className="section-feature-card-inner">
                  <h3 className="section-feature-card-title">{item.title}</h3>
                  <p
                    className="section-feature-card-text"
                    dangerouslySetInnerHTML={{
                      __html: parser.translateHTMLString(item.text),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="section-feature-grid">
            {subItems.map((item, index) => (
              <div className="section-feature-card" key={index}>
                <div className="section-feature-card-inner">
                  <h3 className="section-feature-card-title">{item.title}</h3>
                  <p
                    className="section-feature-card-text"
                    dangerouslySetInnerHTML={{
                      __html: parser.translateHTMLString(item.text),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
