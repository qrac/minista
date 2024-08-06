import { defineConfig } from "minista"
import { pluginSsg } from "minista-plugin-ssg"
import { pluginImage } from "minista-plugin-image"

export default defineConfig({
  plugins: [pluginSsg(), pluginImage({ useCache: true })],
})
