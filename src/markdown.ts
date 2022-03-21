import type { MinistaMarkdownConfig, MinistaUserConfig } from "./types.js"

export const defaultMarkdownConfig: MinistaMarkdownConfig = {
  syntaxHighlighter: "highlight",
}

export async function getMarkdownConfig(userConfig: MinistaUserConfig) {
  const mergedConfig = userConfig.markdown
    ? { ...defaultMarkdownConfig, ...userConfig.markdown }
    : defaultMarkdownConfig
  return mergedConfig
}
