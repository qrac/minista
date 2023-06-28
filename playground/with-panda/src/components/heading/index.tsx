import { css } from "../../../styled-system/css"

export default function ({ text }: { text: string }) {
  return <h2 className={css({ color: "red" })}>{text}</h2>
}
