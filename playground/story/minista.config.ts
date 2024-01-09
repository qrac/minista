import { defineConfig } from "minista"
import { pluginSsg } from "minista-plugin-ssg"
import { pluginMdx } from "minista-plugin-mdx"
import { pluginStory } from "minista-plugin-story"

export default defineConfig({
  plugins: [pluginSsg(), pluginMdx(), pluginStory()],
})
