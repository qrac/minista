import react from "@vitejs/plugin-react"
import { defineConfig, pluginIsland, pluginSsg } from "minista"
export default defineConfig({ plugins: [pluginSsg(), pluginIsland(), react()] })
