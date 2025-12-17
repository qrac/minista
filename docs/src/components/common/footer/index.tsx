import { FiGithub, FiExternalLink } from "react-icons/fi"

import ElementSpacer from "../../element/spacer"

import type { Props } from "./props"
import { initialProps } from "./props"

export default function CommonFooter(props: Partial<Props>) {
  const {
    license,
    repositoryUrl,
    xId,
    xName,
    copyrightStartYear,
    copyrightUrl,
    copyrightName,
  } = { ...initialProps, ...props }
  return (
    <footer className="section is-footer">
      <ElementSpacer height={40} />
      <div className="inner is-space-md">
        <p className="text is-font-sans-en is-flex is-center is-gap-md is-middle is-sm">
          <span className="text is-flex is-gap-xxs is-middle">
            <FiGithub className="icon" />
            <span className="text">{license}</span>
          </span>
          <span className="text is-flex is-gap-xxs is-middle">
            <a
              href={repositoryUrl}
              target="_blank"
              className="text is-link-reverse"
            >
              Repository
            </a>
            <FiExternalLink className="icon" />
          </span>
          <span className="text is-flex is-gap-xxs is-middle">
            <a
              href={repositoryUrl + "/releases"}
              target="_blank"
              className="text is-link-reverse"
            >
              Releases
            </a>
            <FiExternalLink className="icon" />
          </span>
          <span className="text is-flex is-gap-xxs is-middle">
            {"𝕏"}
            <a
              href={"https://twitter.com/" + xId}
              target="_blank"
              className="text is-link-reverse"
            >
              {xName}
            </a>
            <FiExternalLink className="icon" />
          </span>
        </p>
        <p className="text is-font-sans-en is-center is-sm">
          <span>© {copyrightStartYear} </span>
          <a href={copyrightUrl} className="text is-link-reverse">
            {copyrightName}
          </a>
        </p>
      </div>
      <ElementSpacer height={40} />
    </footer>
  )
}
