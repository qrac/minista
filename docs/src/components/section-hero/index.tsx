import { loadDefaultJapaneseParser } from "budoux"

import { message, description } from "../../assets/data/hero.json"
import { ReactComponent as Message } from "../../assets/svgs/message.svg"
import { ReactComponent as BrandReact } from "../../assets/svgs/brand-react.svg"
import { ReactComponent as BrandVite } from "../../assets/svgs/brand-vite.svg"
import ExampleTsx from "../../assets/markdown/example-tsx.md"
import ExampleHtml from "../../assets/markdown/example-html.md"

export default function () {
  const parser = loadDefaultJapaneseParser()
  return (
    <section className="section-hero" id="section-hero">
      <div className="section-hero-inner">
        <ul className="section-hero-grid">
          <li className="section-hero-column">
            <h1>
              <Message className="section-hero-message" title={message} />
            </h1>
            <p
              className="section-hero-description"
              dangerouslySetInnerHTML={{
                __html: parser.translateHTMLString(description),
              }}
            />
            <div className="section-hero-buttons">
              <a href="/docs/setup" className="section-hero-button is-strong">
                Basic Setup
              </a>
              <a href="/docs/" className="section-hero-button">
                Read the Docs
              </a>
            </div>
          </li>
          <li className="section-hero-column">
            <ul className="section-hero-images">
              <li className="section-hero-image">
                <div className="section-hero-window">
                  <div className="section-hero-window-header">
                    <div className="section-hero-window-header-buttons">
                      <span className="section-hero-window-header-button"></span>
                      <span className="section-hero-window-header-button"></span>
                      <span className="section-hero-window-header-button"></span>
                    </div>
                  </div>
                  <div className="section-hero-window-content">
                    <ExampleTsx />
                  </div>
                </div>
                <div className="section-hero-brand-wrap">
                  <BrandReact className="section-hero-brand" />
                </div>
              </li>
              <li className="section-hero-image">
                <div className="section-hero-window">
                  <div className="section-hero-window-header">
                    <div className="section-hero-window-header-buttons">
                      <span className="section-hero-window-header-button"></span>
                      <span className="section-hero-window-header-button"></span>
                      <span className="section-hero-window-header-button"></span>
                    </div>
                  </div>
                  <div className="section-hero-window-content">
                    <ExampleHtml />
                  </div>
                </div>
                <div className="section-hero-brand-wrap">
                  <BrandVite className="section-hero-brand" />
                </div>
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </section>
  )
}
