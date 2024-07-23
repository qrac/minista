type SpriteProps = {
  symbolId: string
  spriteKey?: string
  className?: string
  title?: string
  attributes?: React.SVGProps<SVGSVGElement>
} & React.SVGProps<SVGSVGElement>

export function Sprite({
  symbolId,
  spriteKey = "",
  className,
  title,
  ...attributes
}: SpriteProps) {
  return (
    <svg className={className && className} {...attributes}>
      {title && <title>{title}</title>}
      <use
        href=""
        data-minista-sprite=""
        data-minista-sprite-key={spriteKey}
        data-minista-sprite-symbol-id={symbolId}
      />
    </svg>
  )
}
