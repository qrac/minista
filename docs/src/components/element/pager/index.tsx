import { clsx } from "clsx"

import type { Props } from "./props"
import { initialProps } from "./props"

export default function ElementPager(props: Partial<Props>) {
  const { prevText, prevTitle, prevUrl, nextText, nextTitle, nextUrl } = {
    ...initialProps,
    ...props,
  }
  const hasPrev = prevTitle && prevUrl
  const hasNext = nextTitle && nextUrl
  const hasPager = hasPrev || hasNext
  if (!hasPager) {
    return null
  }
  return (
    <div className="grid is-gap-md">
      <div className="column is-flex-full tablet:is-flex-6">
        {hasPrev && <Link href={prevUrl} title={prevTitle} text={prevText} />}
      </div>
      <div className="column is-flex-full tablet:is-flex-6">
        {hasNext && (
          <Link href={nextUrl} title={nextTitle} text={nextText} isNext />
        )}
      </div>
    </div>
  )
}

function Link({
  href,
  title,
  text,
  isNext,
}: {
  href: string
  title: string
  text: string
  isNext?: boolean
}) {
  return (
    <a
      href={href}
      className={clsx(
        "box is-link is-outline is-px-xxl is-py-md is-radius-xl is-space-xxs",
        isNext ? "is-angle-right" : "is-angle-left"
      )}
    >
      <span className={clsx("text is-block is-xs", isNext && "is-right")}>
        {text}
      </span>
      <span
        className={clsx("text is-block is-weight-500", isNext && "is-right")}
      >
        {title}
      </span>
    </a>
  )
}
