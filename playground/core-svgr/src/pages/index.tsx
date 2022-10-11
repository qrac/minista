import { ReactComponent as Logo } from "../assets/logo.svg"
import heart from "../assets/heart.svg"

export default function () {
  return (
    <>
      <Logo title="minista" className="svgr-logo" width={400} height={88} />
      <img src={heart} alt="" />
    </>
  )
}
