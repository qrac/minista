import { defineConfig } from "minista"
import { pluginEnhance } from "minista-plugin-enhance"
import { pluginEntry } from "minista-plugin-entry"

export default defineConfig({
  plugins: [pluginEnhance(), pluginEntry()],
})
