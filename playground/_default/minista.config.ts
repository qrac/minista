import { defineConfig } from "minista"
import { pluginSsg } from "minista-plugin-ssg"

export default defineConfig({
  plugins: [pluginSsg()],
})
