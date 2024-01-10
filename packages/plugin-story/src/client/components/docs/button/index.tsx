export function StoryAppDocsButton({
  href,
  text,
  isDownload,
}: {
  href: string
  text: string
  isDownload?: boolean
}) {
  return (
    <a className="storyapp-docs-button" href={href} download={isDownload}>
      {text}
    </a>
  )
}
