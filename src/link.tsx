import type { LinkProps as ReactRouterDomLinkProps } from "react-router-dom"

import { Link as ReactRouterDomLink } from "react-router-dom"

type LinkProps = ReactRouterDomLinkProps &
  React.RefAttributes<HTMLAnchorElement>

// Deprecated components
export const Link = (props: LinkProps) => {
  const { to, children, ...attribute } = props
  const href = to.toString()
  if (process.env.NODE_ENV === "development") {
    return (
      <ReactRouterDomLink to={to} {...attribute}>
        {children}
      </ReactRouterDomLink>
    )
  } else {
    return (
      <a href={href} {...attribute}>
        {children}
      </a>
    )
  }
}
