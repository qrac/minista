// Partial Hydration
declare module "*?ph" {
  import * as React from "react"

  const ph: React.FunctionComponent<React.PropsWithChildren>
  export default ph
}
