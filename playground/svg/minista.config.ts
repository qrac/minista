import { defineConfig } from "minista"
import { pluginSsg } from "minista-plugin-ssg"
import { pluginSvg } from "minista-plugin-svg"

export default defineConfig({
  plugins: [pluginSsg(), pluginSvg()],
})
