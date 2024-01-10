import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { StoryApp } from "minista-plugin-story/client"
import "minista-plugin-story/css/app.css"

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
          type: "doc",
        },
        {
          category: "Components",
          label: "ボタン2",
          url: "/story/components/button/secondary",
          type: "doc",
        },
      ]}
    />
  </StrictMode>
)
