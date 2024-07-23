import { defineConfig } from "minista"
import { pluginSsg } from "minista-plugin-ssg"
import { pluginSprite } from "minista-plugin-sprite"

export default defineConfig({
  plugins: [
    pluginSsg(),
    pluginSprite({
      multiple: [
        {
          spriteKey: "sprite2",
          srcDir: "src/assets/sprite2",
          outName: "sprite2",
        },
      ],
    }),
  ],
})
