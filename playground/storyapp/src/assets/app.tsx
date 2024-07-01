import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { StoryApp } from "../../../../packages/plugin-story/src/client"
import "../../../../packages/plugin-story/src/assets/app.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StoryApp
      navItems={[
        {
          category: "Information",
          label: "ホーム",
          url: "/story/information/home",
          type: "doc",
        },
        {
          category: "Components",
          label: "ボタン1",
          url: "/story/components/button/primary",
          type: "story",
        },
        {
          category: "Components",
          label: "ボタン2",
          url: "/story/components/button/secondary",
          type: "story",
        },
      ]}
    />
  </StrictMode>
)
