import icon from "../assets/images/icon.svg"

/** @type {import("minista/types").Metadata} */
export const metadata = {}

/** @param {import("minista/types").PageProps} props */
export default function (props) {
  return (
    <>
      <h1>Hello!</h1>
      <p>
        This is a sample page. You can edit this page at "src/pages/index.jsx".
      </p>
      <img src={icon} alt="Hero" width="60" height="60" />
    </>
  )
}
