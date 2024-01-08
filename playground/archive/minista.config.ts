import { defineConfig } from "minista"
import { pluginEnhance } from "minista-plugin-enhance"
import { pluginEntry } from "minista-plugin-entry"
import { pluginArchive } from "minista-plugin-archive"

export default defineConfig({
  plugins: [pluginEnhance(), pluginEntry(), pluginArchive()],
})
