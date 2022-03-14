import { Link as ReactRouterDomLink } from "react-router-dom"
import type { LinkProps as ReactRouterDomLinkProps } from "react-router-dom"

type LinkProps = ReactRouterDomLinkProps &
  React.RefAttributes<HTMLAnchorElement> & { useDevOnlySpaLink?: boolean }

export const Link = (props: LinkProps) => {
  const { useDevOnlySpaLink = false, to, children, ...attribute } = props
  const href = to.toString()
  if (useDevOnlySpaLink) {
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
