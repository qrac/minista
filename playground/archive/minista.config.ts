import { defineConfig } from "minista"
import { pluginEnhance } from "minista-plugin-enhance"
import { pluginBundle } from "minista-plugin-bundle"
import { pluginArchive } from "minista-plugin-archive"

export default defineConfig({
  plugins: [pluginEnhance(), pluginBundle(), pluginArchive()],
})
