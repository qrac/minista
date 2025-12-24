import type { Metadata, PageProps } from "minista/types"

export const metadata: Metadata = {
  layout: "home",
}

export default function (props: PageProps) {
  return (
    <>
      <div style={{ display: "grid", placeContent: "center", height: "70vh" }}>
        <div className="box is-space-md">
          <div className="box is-flex is-middle is-gap-md">
            <div className="box is-flex is-outline-right is-pr-md is-py-sm">
              <span className="text is-font-sans-en is-weight-700">404</span>
            </div>
            <span className="text is-font-sans-en">Page Not Found</span>
          </div>
          <div className="box is-flex is-center is-sm">
            <a href="/" className="button is-outline">
              <span className="text is-font-sans-en">Back to Home</span>
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
