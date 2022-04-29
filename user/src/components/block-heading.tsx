import "./block-heading.css"

type BlockHeadingProps = {
  children: React.ReactNode
}

const BlockHeading = ({ children }: BlockHeadingProps) => {
  return <h3 className="block-heading">{children}</h3>
}

export default BlockHeading
