import demoHtml from "../assets/demo.html?raw"

export default function () {
  return (
    <div
      dangerouslySetInnerHTML={{
        __html: demoHtml,
      }}
    />
  )
}
