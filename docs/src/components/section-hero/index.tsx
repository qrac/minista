import { loadDefaultJapaneseParser } from "budoux"

import { message, description } from "../../assets/data/hero.json"
import messageImage from "../../assets/svgs/message.svg"
import brandReact from "../../assets/svgs/brand-react.svg"
import brandVite from "../../assets/svgs/brand-vite.svg"
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
              <img
                className="section-hero-message"
                src={messageImage}
                alt={message}
                width={480}
                height={240}
              />
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
                  <img
                    className="section-hero-brand"
                    src={brandReact}
                    alt="React"
                    width={200}
                    height={200}
                  />
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
                  <img
                    className="section-hero-brand"
                    src={brandVite}
                    alt="Vite"
                    width={200}
                    height={202}
                  />
                </div>
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </section>
  )
}
