import { createElement } from "react"

import type { ResolvedConfig } from "../config/index.js"
import type {
  GetStaticData,
  //StaticData,
  PageProps,
  Metadata,
  Frontmatter,
  StoryDecoratorFunction,
  StoryParameters,
  StoryMeta,
  StoryObj,
} from "../shared/index.js"

type StoryComponent = () => React.CElement<
  { [key: string]: any },
  React.Component<PageProps, {}, any>
>

type ImportedJsStories = {
  [key: string]: {
    default: StoryMeta<StoryComponent>
    [key: string]: StoryObj<StoryMeta<StoryComponent>>
  }
}
type ImportedMdxStories = {
  [key: string]: {
    default: StoryComponent
    metadata?: Metadata
    frontmatter?: Frontmatter
  }
}

type Story = {
  path: string
  title: string
  draft: boolean
  hidden: boolean
  component: StoryComponent
  args: { [key: string]: any }
  parameters: StoryParameters
  decorators: StoryDecoratorFunction[]
  metadata: Metadata
  frontmatter: Frontmatter
}
type StoryPage = {
  path: string
  component: StoryComponent
  getStaticData?: GetStaticData
  metadata: Metadata
  frontmatter: Frontmatter
}

export function getStories(config: ResolvedConfig): {
  storyPages: StoryPage[]
  storyItems: []
} {
  if (!config.main.storyapp.useImport) {
    return { storyPages: [] as StoryPage[], storyItems: [] }
  }
  const JS_STORIES: ImportedJsStories = import.meta.glob(
    ["/src/**/*.stories.{js,jsx,ts,tsx}"],
    {
      eager: true,
    }
  )
  const MDX_STORIES: ImportedMdxStories = import.meta.glob(
    ["/src/**/*.stories.{md,mdx}"],
    {
      eager: true,
    }
  )
  const jsStories: Story[][] = Object.keys(JS_STORIES).map((storyFileKey) => {
    const storyFile = JS_STORIES[storyFileKey]
    const storyMeta = storyFile.default

    if (!storyMeta?.id || !storyMeta?.title) {
      return []
    }
    const storyBase = "/" + config.main.storyapp.outDir
    const storyId = ((storyMeta.id || storyMeta.title) as string)
      .split("/")
      .map((id) => id.trim().toLowerCase())
      .join("/")
    const storyTitle = (storyMeta.title as string)
      .split("/")
      .map((title) => title.trim())
      .join(" / ")
    const storyList = Object.keys(storyFile)
      .filter((key) => !["default", "metadata", "frontmatter"].includes(key))
      .map((key) => ({ storyKey: key, storyObj: storyFile[key] }))

    return storyList.map((item) => {
      const currentObj = item.storyObj
      const currentId = item.storyKey.toLowerCase()
      const currentTitle = currentObj.name || item.storyKey
      const pagePath = [storyBase, storyId, currentId].join("/")
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
        frontmatter: { ...{}, ...(storyFile.frontmatter || {}) },
      }
    })
  })
  const mdxStories: Story[][] = Object.keys(MDX_STORIES).map((storyFileKey) => {
    const storyFile = MDX_STORIES[storyFileKey]
    const storyMeta = {
      ...(storyFile.frontmatter || {}),
      ...(storyFile.metadata || {}),
    }
    const storyBase = "/" + config.main.storyapp.outDir
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
    const pagePath = [storyBase, storyId].join("/")
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
        frontmatter: { ...{}, ...(storyFile.frontmatter || {}) },
      },
    ]
  })
  const mergesStories = [...jsStories, ...mdxStories]
    .flat()
    .filter((item) => Object.keys(item).length !== 0)
  const uniqueStories = Object.values(
    Object.fromEntries(mergesStories.map((item) => [item.path, item]))
  )

  if (!uniqueStories.length) {
    return { storyPages: [] as StoryPage[], storyItems: [] }
  }
  const storyPages: StoryPage[] = uniqueStories.map((item) => {
    const baseComponent = () => createElement(item.component, item.args)
    const decoratedComponent = (item.decorators.length > 0
      ? item.decorators.reduceRight((accumulator, currentValue) => {
          const result = accumulator as unknown as StoryComponent
          return () => currentValue(result)
        }, baseComponent)
      : baseComponent) as unknown as StoryComponent
    const metadata = {
      title: item.title,
      draft: item.draft,
      ...item.metadata,
      ...item.frontmatter,
    } as Metadata
    return {
      path: item.path,
      component: decoratedComponent,
      getStaticData: undefined,
      metadata,
      frontmatter: item.frontmatter,
    }
  })
  return { storyPages, storyItems: [] }
}
