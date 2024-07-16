import { defineConfig } from "minista"
import { pluginEnhance } from "minista-plugin-enhance"
import { pluginBundle } from "minista-plugin-bundle"
import { pluginBeautify } from "minista-plugin-beautify"

export default defineConfig({
  plugins: [pluginEnhance(), pluginBundle(), pluginBeautify()],
})
