import ReactDOM from "react-dom"
import { Pages } from "./pages.js"

ReactDOM.render(<Pages />, document.getElementById("root"))

if (import.meta.hot) {
  import.meta.hot.accept()
}
