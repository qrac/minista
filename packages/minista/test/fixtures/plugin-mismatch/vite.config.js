import { defineConfig, pluginSsg } from "minista"

const renderOnly = { name: "fixture:render-only" }
const clientOnly = { name: "fixture:client-only" }

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [pluginSsg(), isSsrBuild ? renderOnly : clientOnly],
}))
