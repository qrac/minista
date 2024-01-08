import { EnhancePage } from "minista-plugin-enhance/client"

import html from "./index.html?raw"

export default function (): EnhancePage {
  return {
    html,
    commands: [
      {
        selector: "head",
        method: "insert",
        html: `<link rel="stylesheet" href="/src/assets/style.css" data-test="" />`,
      },
      {
        selector: "head",
        method: "insert",
        html: `<link rel="stylesheet" href="/src/assets/dummy.css" />`,
      },
      {
        selector: "head",
        method: "insert",
        html: `<script type="module" src="/src/assets/script.ts"></script>`,
      },
    ],
  }
}
