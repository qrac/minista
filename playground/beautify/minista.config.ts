import { defineConfig } from "minista"
import { pluginEnhance } from "minista-plugin-enhance"
import { pluginEntry } from "minista-plugin-entry"
import { pluginBeautify } from "minista-plugin-beautify"

export default defineConfig({
  plugins: [pluginEnhance(), pluginEntry(), pluginBeautify()],
})
