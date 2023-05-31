import { loadDefaultJapaneseParser } from "budoux"

import {
  main as mainItems,
  lib as libItems,
  sub as subItems,
} from "../../assets/data/feature.json"

type Item = {
  title: string
  text: string
  url?: string
  linkText?: string
}

export default function () {
  return (
    <section className="section-feature" id="section-feature">
      <div className="section-feature-inner">
        <h2 className="section-feature-title">Feature</h2>
        <div className="section-feature-grids">
          <div className="section-feature-grid">
            {mainItems.map((item, index) => (
              <FeatureCard item={item} key={index} />
            ))}
          </div>
          <div className="section-feature-grid">
            {libItems.map((item, index) => (
              <FeatureCard item={item} key={index} />
            ))}
          </div>
          <div className="section-feature-grid">
            {subItems.map((item, index) => (
              <FeatureCard item={item} key={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function FeatureCard({ item }: { item: Item }) {
  const parser = loadDefaultJapaneseParser()
  return (
    <div className="section-feature-card">
      <div className="section-feature-card-inner">
        <h3 className="section-feature-card-title">{item.title}</h3>
        <p
          className="section-feature-card-text"
          dangerouslySetInnerHTML={{
            __html: parser.translateHTMLString(item.text),
          }}
        />
      </div>
      {item.url && (
        <a href={item.url} className="section-feature-card-link">
          {item.linkText ? item.linkText : "詳細"}
          {" →"}
        </a>
      )}
    </div>
  )
}
