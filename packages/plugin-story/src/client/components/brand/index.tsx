export function StoryAppBrand({
  brandTitle,
  brandUrl,
  brandImage,
  brandTarget,
}: {
  brandTitle: string
  brandUrl: string
  brandImage: string
  brandTarget: "_self" | "_blank"
}) {
  return (
    <div className="storyapp-brand">
      <Link brandUrl={brandUrl} brandTarget={brandTarget}>
        {brandImage ? (
          <span className="storyapp-brand-logo-wrap">
            <img
              className="storyapp-brand-logo"
              src={brandImage}
              alt={brandTitle}
            />
          </span>
        ) : (
          <span className="storyapp-brand-title-wrap">
            <span className="storyapp-brand-title">{brandTitle}</span>
          </span>
        )}
      </Link>
    </div>
  )
}

function Link({
  brandUrl,
  brandTarget,
  children,
}: {
  brandUrl: string
  brandTarget: "_self" | "_blank"
  children: React.ReactNode
}) {
  if (!brandUrl) return <>{children}</>
  return (
    <a
      className="storyapp-brand-link"
      href={brandUrl}
      target={brandTarget}
      rel="noopener noreferrer"
    >
      {brandUrl}
    </a>
  )
}
