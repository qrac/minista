import { createElement } from "react"

import type {
  StoryParameters,
  StoryDecoratorFunction,
  Metadata,
} from "../@types/shared.js"
import type {
  ImportedStories,
  ImportedJsStories,
  ImportedMdxStories,
  FormatedPage,
  Story,
  PageComponent,
} from "../@types/node.js"
import type { PluginOptions } from "./option.js"

export function formatStories(
  STORIES: ImportedStories,
  opts: PluginOptions
): FormatedPage[] {
  const JS_STORIES = Object.entries(STORIES).filter(([key]) => {
    const reg = /\.stories\.[tj]sx?$/
    return reg.test(key)
  })
  const MDX_STORIES = Object.entries(STORIES).filter(([key]) => {
    const reg = /\.stories\.mdx?$/
    return reg.test(key)
  })
  const ImportedJsStories: ImportedJsStories = Object.fromEntries(JS_STORIES)
  const ImportedMdxStories: ImportedMdxStories = Object.fromEntries(MDX_STORIES)

  const jsStories: Story[][] = Object.keys(ImportedJsStories).map(
    (storyFileKey) => {
      const storyFile = ImportedJsStories[storyFileKey]
      const storyMeta = storyFile.default

      if (!storyMeta?.id && !storyMeta?.title) {
        return []
      }
      const storyBase = ["/", opts.outDir].join("/").replace(/\/+/g, "/")
      const storyId = ((storyMeta.id || storyMeta.title) as string)
        .split("/")
        .map((id) => id.trim().toLowerCase())
        .join("/")
      const storyTitle = (storyMeta.title as string)
        .split("/")
        .map((title) => title.trim())
        .join(" / ")
      const storyList = Object.keys(storyFile)
        .filter((key) => !["default", "metadata"].includes(key))
        .map((key) => ({ storyKey: key, storyObj: storyFile[key] }))
      return storyList.map((item) => {
        const currentObj = item.storyObj
        const currentId = item.storyKey.toLowerCase()
        const currentTitle = currentObj.name || item.storyKey
        const pagePath = [storyBase, storyId, currentId]
          .join("/")
          .replace(/\/+/g, "/")
        const title = [storyTitle, currentTitle].join(" / ")
        const draft = currentObj.draft || storyMeta.draft || false
        const hidden = currentObj.hidden || storyMeta.hidden || false
        const component = storyMeta.component
        const args = {
          ...(storyMeta.args || {}),
          ...(currentObj.args || {}),
        } as { [key: string]: any }
        const parameters = {
          ...(storyMeta.parameters || {}),
          ...(currentObj.parameters || {}),
        } as StoryParameters
        const decorators = [
          ...(storyMeta.decorators || []),
          ...(currentObj.decorators || []),
        ].flat()
        return {
          path: pagePath,
          title,
          draft,
          hidden,
          component,
          args,
          parameters,
          decorators,
          metadata: { ...{}, ...(storyFile.metadata || {}) },
        }
      })
    }
  )
  const mdxStories: Story[][] = Object.keys(ImportedMdxStories).map(
    (storyFileKey) => {
      const storyFile = ImportedMdxStories[storyFileKey]
      const storyMeta = {
        ...(storyFile.metadata || {}),
      }
      const storyBase = ["/", opts.outDir].join("/").replace(/\/+/g, "/")
      const storyId = ((storyMeta.id || storyMeta.title || "") as string)
        .split("/")
        .map((id) => id.trim().toLowerCase())
        .join("/")
      const storyTitle = ((storyMeta.title || "") as string)
        .split("/")
        .map((title) => title.trim())
        .join(" / ")
      if (!storyId || !storyTitle) {
        return []
      }
      const pagePath = [storyBase, storyId].join("/").replace(/\/+/g, "/")
      const title = [storyTitle].join(" / ")
      const draft = storyMeta.draft || false
      const hidden = storyMeta.hidden || false
      const component = storyFile.default
      const args = { ...(storyMeta.args || {}) } as { [key: string]: any }
      const parameters = {
        ...(storyMeta.parameters || {}),
      } as StoryParameters
      const decorators = [
        ...(storyMeta.decorators || []),
      ].flat() as StoryDecoratorFunction[]
      return [
        {
          path: pagePath,
          title,
          draft,
          hidden,
          component,
          args,
          parameters,
          decorators,
          metadata: { ...{}, ...(storyFile.metadata || {}) },
        },
      ]
    }
  )
  const mergesStories = [...jsStories, ...mdxStories]
    .flat()
    .filter((item) => Object.keys(item).length !== 0)
  const uniqueStories = Object.values(
    Object.fromEntries(mergesStories.map((item) => [item.path, item]))
  )

  if (!uniqueStories.length) {
    return []
  }
  const formatedPages: FormatedPage[] = uniqueStories.map((item) => {
    const baseComponent = () => createElement(item.component, item.args)
    const decoratedComponent = (item.decorators.length > 0
      ? item.decorators.reduceRight((accumulator, currentValue) => {
          const result = accumulator as unknown as PageComponent
          return () => currentValue(result)
        }, baseComponent)
      : baseComponent) as unknown as PageComponent
    const metadata = {
      title: item.title,
      draft: item.draft,
      ...item.metadata,
    } as Metadata
    return {
      path: item.path,
      component: decoratedComponent,
      getStaticData: undefined,
      metadata,
    }
  })
  return formatedPages
}
