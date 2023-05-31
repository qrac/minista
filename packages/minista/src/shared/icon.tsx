type IconProps = {
  iconId: string
  srcDir?: string
  className?: string
  title?: string
  attributes?: React.SVGProps<SVGSVGElement>
} & React.SVGProps<SVGSVGElement>

export function Icon({
  iconId,
  srcDir = "",
  className,
  title,
  ...attributes
}: IconProps) {
  return (
    <svg className={className && className} {...attributes}>
      {title && <title>{title}</title>}
      <use
        href=""
        data-minista-transform-target="icon"
        data-minista-icon-iconid={iconId}
        data-minista-icon-srcdir={srcDir}
      />
    </svg>
  )
}
