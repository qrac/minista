type SpriteProps = {
  src: string
  className?: string
  title?: string
  attributes?: React.SVGProps<SVGSVGElement>
} & React.SVGProps<SVGSVGElement>

export function Svg({ src, className, title, ...attributes }: SpriteProps) {
  return (
    <svg
      className={className && className}
      xmlns="http://www.w3.org/2000/svg"
      {...attributes}
      data-minista-svg=""
      data-minista-svg-src={src}
    >
      {title && <title>{title}</title>}
    </svg>
  )
}
