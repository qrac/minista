/** @type {import("minista/types").Metadata} */
export const metadata = {
  title: "About",
  draft: false, // true = Don't build the page
}

/** @param {import("minista/types").PageProps} props */
export default function (props) {
  return (
    <>
      <h1>{props.title}</h1>
      <p>
        This is a sample page. You can edit this page at "src/pages/about.jsx".
      </p>
    </>
  )
}
