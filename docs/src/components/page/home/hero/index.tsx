import { LuGithub, LuExternalLink } from "react-icons/lu"
import { Svg } from "minista/assets"

import ElementSpacer from "../../../element/spacer"

import ExampleTsx from "./example-tsx.md"
import ExampleHtml from "./example-html.md"
import brandReact from "../../../../assets/images/brand-react.svg"
import brandVite from "../../../../assets/images/brand-vite.svg"

import type { Props } from "./props"
import { initialProps } from "./props"
import "./style.css"

export default function PageHomeHero(props: Partial<Props>) {
  return (
    <section className="section is-hero wide:is-lg">
      <ElementSpacer height={40} />
      <div className="box is-none tablet:is-block">
        <ElementSpacer height={20} />
      </div>
      <div className="inner is-px-lg">
        <div className="hero-grid">
          <HeroLeft {...props} />
          <HeroRight />
        </div>
      </div>
      <div className="box is-none tablet:is-block">
        <ElementSpacer height={20} />
      </div>
      <ElementSpacer height={60} />
    </section>
  )
}

function HeroLeft(props: Partial<Props>) {
  const { description, license, repositoryUrl, actions } = {
    ...initialProps,
    ...props,
  }
  return (
    <div className="hero-column is-space-lg">
      <Svg
        src="/src/assets/images/message.svg"
        width={500}
        height={136}
        className="image is-full-auto"
      />
      <div className="box is-space-md">
        <h1 className="text is-autospace is-auto-phrase is-sm">{description}</h1>
        <div className="box is-flex is-gap-sm">
          {actions.map((action) => (
            <a
              key={action.url}
              href={action.url}
              className={`button ${action.variant === "primary" ? "is-plain is-primary" : "is-outline is-secondary"} is-angle-right`}
            >
              <span className="text is-pr-md">{action.name}</span>
            </a>
          ))}
        </div>
        <p className="text is-font-sans-en is-flex is-gap-md is-middle is-sm">
          <span className="text is-flex is-gap-xxs is-middle">
            <LuGithub className="icon" />
            <span className="text">{license}</span>
          </span>
          <span className="text is-flex is-gap-xxs is-middle">
            <a
              href={repositoryUrl}
              rel="noopener noreferrer"
              target="_blank"
              className="text is-link-reverse"
            >
              Repository
            </a>
            <LuExternalLink className="icon" />
          </span>
          <span className="text is-flex is-gap-xxs is-middle">
            <a
              href={repositoryUrl + "/releases"}
              rel="noopener noreferrer"
              target="_blank"
              className="text is-link-reverse"
            >
              Releases
            </a>
            <LuExternalLink className="icon" />
          </span>
        </p>
      </div>
    </div>
  )
}

function HeroRight() {
  return (
    <div className="hero-column">
      <div className="hero-stages">
        <div className="hero-stage">
          <div className="hero-window">
            <div className="hero-window-content">
              <ExampleTsx />
            </div>
          </div>
          <div className="hero-brand">
            <img
              className="image"
              src={brandReact}
              alt="React"
              width="200"
              height="200"
            />
          </div>
        </div>
        <div className="hero-stage">
          <div className="hero-brand">
            <img
              className="image"
              src={brandVite}
              alt="Vite"
              width="200"
              height="192"
            />
          </div>
          <div className="hero-window">
            <div className="hero-window-content">
              <ExampleHtml />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
