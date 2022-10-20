type IconProps = {
  iconId: string
  className?: string
  title?: string
  attributes?: React.SVGProps<SVGSVGElement>
} & React.SVGProps<SVGSVGElement>

export function Icon(props: IconProps) {
  const { iconId, className, title, attributes } = props
  return (
    <svg className={className && className} {...attributes}>
      {title && <title>{title}</title>}
      <use href={"/@minista-temp/__minista_plugin_sprite.svg#" + iconId} />
    </svg>
  )
}
