import { defineConfig } from "minista"
import { pluginSsg } from "minista-plugin-ssg"
import { pluginMdx } from "minista-plugin-mdx"

export default defineConfig({
  plugins: [pluginSsg(), pluginMdx()],
})
