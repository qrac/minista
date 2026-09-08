import { defineConfig, pluginSsg, pluginEntry, pluginImage, pluginSvg, pluginSprite, pluginComment, pluginIsland, pluginSearch, pluginBeautify, pluginArchive } from "minista"
import { Image, Picture, Svg, Sprite, Comment, Search } from "minista/assets"
import { Head } from "minista/head"
import { HeadContext } from "minista/context"
import type { Metadata, PageProps, LayoutProps, GetStaticData, StaticData } from "minista/types"
import "minista/client"
import Markdown from "./page.md"
import Mdx from "./page.mdx"

defineConfig({ plugins: [
  pluginSsg({ mdx: { jsxRuntime: "automatic", remarkPlugins: [() => tree => tree], frontmatter: { name: "metadata" } }, bundle: {} }),
  pluginEntry(), pluginImage({ optimize: { format: "webp", formatOptions: { webp: { lossless: true } } } }),
  pluginSvg({ config: { multipass: true } }), pluginSprite({ config: { multipass: true } }), pluginComment(),
  pluginIsland({ rootDOMElement: "span", rootStyle: { display: "contents" } }),
  pluginSearch({ hit: { minLength: 2 } }),
  pluginBeautify({ htmlOptions: { indent_size: 2 }, jsOptions: { brace_style: "collapse" } }),
  pluginArchive({ archives: [{ outName: "site", options: { zlib: { level: 9 } } }, { outName: "site", format: "tar", options: { gzip: true } }] }),
] })
const components = <><Image src="a.png" /><Picture src="a.png" /><Svg src="a.svg" /><Sprite src="icons" /><Comment text="hello" /><Search maxHitPages={5} /><Head title="Title" /><Markdown /><Mdx /></>
const metadata: Metadata = { title: "Title" }
const page: PageProps = { url: "/", title: "Title", draft: false }
const layout: LayoutProps = { ...page, children: components }
const data: StaticData = { props: {} }
const getData: GetStaticData = async () => data
void [HeadContext, metadata, layout, getData]
// @ts-expect-error Invalid SSG nested option.
pluginSsg({ mdx: { jsxRuntime: "invalid" } })
// @ts-expect-error Internal compiler option is not public.
pluginSsg({ mdx: { development: true } })
// @ts-expect-error Plugin argument cannot be a scalar.
pluginEntry(null)
// @ts-expect-error Invalid image format.
pluginImage({ optimize: { format: "gif" } })
// @ts-expect-error Invalid SVGO option.
pluginSvg({ config: { multipass: "yes" } })
// @ts-expect-error Invalid SVGO option.
pluginSprite({ config: { multipass: "yes" } })
// @ts-expect-error Plugin argument cannot be null.
pluginComment(null)
// @ts-expect-error Must remain typed, not any.
pluginIsland({ rootDOMElement: "section" })
// @ts-expect-error Invalid search option.
pluginSearch({ hit: { minLength: "two" } })
// @ts-expect-error Must retain dependency option types.
pluginBeautify({ htmlOptions: { indent_size: "two" } })
// @ts-expect-error Invalid archive format.
pluginArchive({ archives: [{ outName: "site", format: "7z" }] })
// @ts-expect-error Image source required.
const badImage = <Image />
// @ts-expect-error Invalid component prop.
const badSearch = <Search maxHitPages="five" />
void [badImage, badSearch]

// @ts-expect-error Picture source required.
const badPicture = <Picture />
// @ts-expect-error SVG source required.
const badSvg = <Svg />
// @ts-expect-error Sprite source required.
const badSprite = <Sprite />
// @ts-expect-error Comment content required.
const badComment = <Comment />
// @ts-expect-error Head title must be a string.
const badHead = <Head title={42} />
void [badPicture, badSvg, badSprite, badComment, badHead]
