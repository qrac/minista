# Architecture

最終確認日: 2026-08-12

> この文書は移行期間中です。「Current」は現在の `v5` branch (`4e06452`) に実装されているv4由来構造、「Target」はv5で採用するが未実装の構造です。移行完了後はTargetをCurrentに統合し、未実装事項を `roadmap.md` のみに残します。

## Current: 現在実装されている構造

### パッケージと公開API

monorepoは主に次で構成されています。

- `packages/minista`: SSG本体。実装はJavaScript、型は隣接する `.d.ts`
- `packages/create-minista`: starter生成CLI
- `docs`: minista自身で構築する公開ドキュメント
- `playground`: pluginごとの動作確認プロジェクト
- `packages/minista/test`: pure utilityを中心としたVitest test

package runtime entryは `src/node.js` です。CLI、test、workspace packageは `src/` のJavaScriptを直接実行し、通常の開発にcompile済み `dist/` を必要としません。公開型は `src/*.d.ts` を参照します。`src/node.js` はViteの `defineConfig` と12個の `pluginXXX()` をexportし、`pluginMdx()` を除く各機能は、状態をclosureに持つVite pluginとして実装されています。

### Current build lifecycle

通常の `minista build` は同じNode.js processからViteのprogrammatic `build()` をrender/clientの順に呼びます。programmatic adapterがまだ変換できないVite CLI flagを指定した場合だけ、compatibility fallbackとして `cross-spawn` でVite CLIを二度起動します。

```text
minista build (current programmatic path)
  ├─ build({ build: { ssr: true } })
  │    └─ page/layout glob entryをbundle
  │         -> node_modules/.minista/ssr/__minista-ssg.mjs
  └─ build({ build: { ssr: false } })
       ├─ SSR bundleをnative import
       ├─ getStaticDataとReact renderToStringを実行
       ├─ node_modules/.minista/ssg/__minista-ssg.mjsへHTML配列を書き出す
       ├─ featureがそのファイルをglob + native import
       └─ Vite bundleを直接変更してHTML / assetを出力
```

CLI processは一つになりましたが、二つのVite buildの間に型付きcontractはまだなく、`.minista` 内の実行可能な `.mjs` と生成sourceが引き継ぎprotocolです。`--oneBuild` はこの前半を省略するescape hatchです。

App Buildも検証しましたが、Viteは全environmentのconfigをbuild前に解決する一方、現行client pluginはconfig hook内でrender temp moduleを即時importします。このため、featureのconfig-time temp importをgraph/artifact inputに移すまでは `createBuilder()` へ切り替えられません。この制約は `vite.md` とroadmapに記録しています。

### Current dev lifecycle

`pluginSsg()` がVite middlewareを登録し、requestごとに `server.ssrLoadModule(globFile)` で全page/layout moduleを評価します。その後にrouteと一致するpageを `renderToString()` し、`server.transformIndexHtml()` へ渡します。

Image / Sprite / Islandなども `transformIndexHtml()` でHTMLを解析・置換し、開発用sourceやassetを `.minista` に生成します。IslandとSearchは `virtual:ssg-pages` を `ssrLoadModule()` して、SSG pluginのclosure内にあるHTML配列を取得します。

`pluginSsg()` のHMRは既に `this.environment`, environment module graph, `hotUpdate` を一部使用しますが、module evaluationは旧 `ssrLoadModule()`、reloadは多くの場合full reloadです。

### Current data model

実際のbuild plugin間で共有される中心的な値は引き続き次の `SsgPage` です。

```ts
type SsgPage = {
  url: string
  fileName: string
  html: string
}
```

一方、v5のside-by-side基盤として `ProjectGraph`、branded node ID、RouteNode、PageNode、AssetNode、IslandNode、ImageNode、BuildArtifactは実装済みです。Core、SSG feature、React/Vite adapterのruntime実装はJavaScript + JSDocへ移行済みで、型専用の隣接 `.d.ts` とともにsourceから直接実行します。`check` / `inspect` / `explain` に加え、legacy SSG build/devのroute discoveryと `getStaticData()` 解決もRoute/Page Graphを使用します。renderer以降のfeature連携はまだ旧 `SsgPage` contractを使用しています。

各公開pluginは `api.minista.feature` に `id`, `apiVersion`, `options`, `provides`, `requires` を持つmachine-readable metadataを公開し始めています。domain phase schedulerへの接続は未完了です。

### Current feature coupling

| Producer / consumer | 実際のcontract | 問題 |
| --- | --- | --- |
| CLI → SSG | 二回のVite processと `--ssr` | 一つのlifecycleとして失敗・cleanupを扱えない |
| SSG → Entry/Image/Island/Search/Sprite | `.minista/ssg/*.mjs` の `ssgPages` | 型なし、実行可能temp file、前回buildの残存を区別できない |
| Page → feature | HTML marker attributeと文字列snippet | source identityとdependencyが失われる |
| Island SSR → client build | encoded JSX snippet fileとHTML内のencoded snippet | 置換衝突、順序、生成sourceに依存する |
| Vite output → feature | `generateBundle` でoutput bundleを探索・直接変更 | 複数pluginが同じHTMLを順番に再parseする |
| Search / Entry | 生成済みHTMLからURLを抽出 | asset / page graphがないため文字列解析が唯一の情報源 |
| Beautify / Archive | plugin orderと `enforce: post` | feature完了順がVite hook orderに埋め込まれる |

module-level global variableはほぼ使われていませんが、plugin instance closureのmutable stateはenvironment単位にkey化されていません。将来plugin instanceをenvironment間で共有するとstate混線の危険があります。

### Current diagnostics and tests

- legacy build pluginのerrorはまだthrow、`console.error`、警告文字列が中心
- Coreの `DiagnosticCollector` とstable diagnostic codeは実装済み
- `check [--json]`, `inspect [--json]`, `explain [--json]` は実装済みで、Vite ModuleRunnerによりpage moduleと `getStaticData()` を評価する
- public manifestの型と安全なprojectionは実装済みだが、filesystem writerとbuildからの出力は未実装
- representative fixture build、project command、Core/feature/adapterのunit testを追加済み
- JavaScript implementationと `.d.ts` が分離し、`StaticData.props` などに `any` が残る

### Current v5 migration directories

次は実装済みです。

```text
packages/minista/src/
├─ core/                   # graph, lifecycle, diagnostics, artifacts, manifest, query, ports
├─ features/ssg/           # route discoveryとpage resolution
└─ adapters/
   ├─ react/               # renderToString / prerenderToNodeStream
   └─ vite/                # project query serviceとlegacy SSG projection
```

Core用 `tsconfig.core.json` はJavaScript + JSDocと隣接 `.d.ts` をstrict modeで直接型検査します。repository全体の `tsc --noEmit` でも同じsourceを検査します。

package entry、CLI、testは `src/` を直接参照します。`prepare`、`prepack`、test前のruntime buildは行わず、編集直後のsourceをそのまま検証できます。

## Currentの主要問題

最大の問題は、Ministaのdomain lifecycleがVite plugin hookに分散し、`.minista` のexecutable temp fileとHTML文字列がfeature間APIになっていることです。その結果、責務・入力・出力・順序・失敗地点を型や単一のgraphから判断できず、人間もAIも局所変更の影響範囲を毎回コード全体から推測する必要があります。

## Target: v5で採用する構造（未実装）

### Layer boundary

```text
Public API compatibility facade
  pluginSsg(), pluginImage(), defineConfig(), public types
                           ↓ feature descriptor
Minista Features
  ssg, mdx, image, island, entry, sprite, search, ...
                           ↓ typed phase input/output
Minista Core
  ProjectGraph, lifecycle, artifact store, diagnostics, manifest
                           ↓ ports
Adapters
  Vite adapter, filesystem adapter, React renderer, future CLI/JSON/MCP
```

依存方向は常に外側からCoreへ向けます。Coreは `vite`, React, HTML parser, filesystem concrete APIをimportしません。必要な処理はport interfaceとして受け取ります。

### Target package layout

最初はpackageを増やさず `packages/minista/src` 内で境界を作り、APIが安定してから物理package分割を判断します。

```text
packages/minista/src/
├─ public/                 # compatibility facadeとpublic types
├─ core/
│  ├─ graph/              # immutable IDとgraph mutation API
│  ├─ lifecycle/          # phase runnerとfeature scheduler
│  ├─ diagnostics/        # collector, formatter, error policy
│  ├─ manifest/           # versioned JSON schema
│  └─ artifacts/          # ArtifactStore port
├─ features/
│  ├─ ssg/
│  ├─ image/
│  ├─ island/
│  └─ ...
├─ adapters/
│  ├─ vite/
│  ├─ react/
│  └─ filesystem/
└─ cli/
```

旧 `src/plugins/*` は移行中のfacadeとして残し、feature移行後に内部から新実装を呼びます。

### Project Graph

Graphは一つの巨大mutable objectを各featureに渡しません。安定IDを持つread modelと、phaseごとに許可されたcommandを分けます。

```ts
type NodeId<T extends string> = `${T}:${string}`

interface ProjectGraph {
  schemaVersion: "1"
  project: ProjectNode
  features: ReadonlyMap<FeatureId, FeatureNode>
  routes: ReadonlyMap<RouteId, RouteNode>
  pages: ReadonlyMap<PageId, PageNode>
  assets: ReadonlyMap<AssetId, AssetNode>
  islands: ReadonlyMap<IslandId, IslandNode>
  images: ReadonlyMap<ImageId, ImageNode>
  artifacts: ReadonlyMap<ArtifactId, BuildArtifact>
}

interface RouteNode {
  id: RouteId
  sourceFile: ProjectPath
  pattern: string
  params: readonly RouteParam[]
  pageModuleId: string
}

interface PageNode<Props extends Record<string, unknown> = Record<string, unknown>> {
  id: PageId
  routeId: RouteId
  url: string
  params: Readonly<Record<string, string>>
  props: Readonly<Props>
  metadata: Readonly<Record<string, unknown>>
  draft: boolean
}

interface PageArtifact {
  id: ArtifactId
  pageId: PageId
  document: HtmlDocument
  assetRefs: readonly AssetReference[]
  islandRefs: readonly IslandReference[]
  imageRefs: readonly ImageReference[]
  metadata: Readonly<Record<string, unknown>>
}

interface AssetNode {
  id: AssetId
  kind: "source" | "generated" | "remote" | "bundle"
  source?: ProjectPath
  contentHash?: string
  consumers: readonly PageId[]
  output?: OutputLocation
}

interface BuildArtifact {
  id: ArtifactId
  kind: "html" | "script" | "style" | "image" | "sprite" | "data" | "archive"
  owner: FeatureId
  source: ArtifactSource
  output?: OutputLocation
  dependencies: readonly ArtifactId[]
}
```

`ProjectPath` はproject root相対・POSIX separator・先頭 `/` なしに正規化します。IDはsource identityとvariant keyから決定的に生成し、配列indexやdiscovery順に依存させません。

`PageNode.props` と `metadata` はuser moduleを実行するbuild session内だけのruntime valueで、manifestへ直列化しません。これにより、現行APIで利用できるJSON以外のpropsも維持します。JSON境界では別のallowlist projectionを定義します。

HTMLは外部出力形式であり続けますが、feature連携の主protocolにはしません。HTMLを扱うfeatureは `HtmlDocument` portを通してmarkerとgraph node IDを対応付け、同一documentをcompose phaseで一度だけserializeします。

### Feature contract

各 `pluginXXX()` はtarget内部では `MinistaFeature` を生成します。

```ts
interface MinistaFeature<Options = unknown> {
  id: FeatureId
  apiVersion: 1
  options: Readonly<Options>
  requires?: readonly Capability[]
  provides?: readonly Capability[]
  after?: readonly FeatureId[]
  hooks: Partial<FeatureHooks>
}

interface FeatureHooks {
  discover(ctx: DiscoverContext): Awaitable<void>
  resolve(ctx: ResolveContext): Awaitable<void>
  render(ctx: RenderContext): Awaitable<void>
  analyze(ctx: AnalyzeContext): Awaitable<void>
  generate(ctx: GenerateContext): Awaitable<void>
  compose(ctx: ComposeContext): Awaitable<void>
  emit(ctx: EmitContext): Awaitable<void>
  finalize(ctx: FinalizeContext): Awaitable<void>
}
```

phase内のfeature順はuserのVite plugin配列ではなく、`requires`, `provides`, `after` のdependency graphをtopological sortして決めます。循環、capability不足、同じartifactの競合はdiagnosticにします。`after` は同一phaseのtie-breakerに限り、data dependencyはcapability / graph edgeで表現します。

### Lifecycle

採用phaseは次です。

| Phase | 主な結果 | I/O / side effect |
| --- | --- | --- |
| `discover` | feature、route source、source asset | projectのreadのみ |
| `resolve` | page instance、param、metadata、依存edge | `getStaticData` 等のuser code実行をport経由で許可 |
| `render` | page documentとrender diagnostic | renderer portを使用 |
| `analyze` | island/image/asset reference | document read、graph commandのみ |
| `generate` | generated image、sprite、search data、client entry plan | ArtifactStoreへのcontent-addressed write |
| `bundle` | Viteが返すoutput manifest | Vite adapterのみが実行 |
| `compose` | hashed URLを反映したfinal document | HtmlDocumentを一度serialize |
| `emit` | distと `.minista/manifest.json` | emitter portのみがfilesystem write |
| `finalize` | beautify、archive、summary | declared artifactのみ変更可 |

Core runnerはphase、feature、node IDを含むtrace eventを発行します。同じinput/config/content hashに対するphaseは将来cache可能にしますが、初期実装では正しさを優先します。

### Artifact Storeとmanifest

`.minista` は暗黙の一時ディレクトリから、明示contractを持つworkspaceに変えます。

```text
.minista/
├─ manifest.json           # public machine-readable snapshot
├─ diagnostics.json        # last check/build diagnostics
└─ work/                   # private, buildId単位、削除可能
   └─ <buildId>/
      ├─ render/
      ├─ generated/
      └─ client/
```

`manifest.json` はJSON dataのみで、JavaScript moduleをimportしません。最低限 `schemaVersion`, `generator`, `project`, `features`, `routes`, `pages`, `assets`, `artifacts`, `diagnosticSummary`, `createdAt` を持ちます。絶対path、秘密情報、page propsの任意データは既定で出力しません。manifest writerは安定key orderとatomic replaceを使います。

`work/<buildId>` はphase間の明示的ArtifactStoreです。producer、content hash、media type、schema versionをmetadataに記録し、別buildの残骸を読みません。

### Structured diagnostics

```ts
interface Diagnostic {
  code: `MINISTA_${string}`
  severity: "error" | "warning" | "info"
  message: string
  hint?: string
  location?: {
    file: ProjectPath
    line?: number
    column?: number
    endLine?: number
    endColumn?: number
  }
  phase?: BuildPhase
  feature?: FeatureId
  nodeId?: string
  related?: readonly DiagnosticRelatedLocation[]
  docsUrl?: string
}
```

例となるstable codeは `MINISTA_ROUTE_DUPLICATE`, `MINISTA_ROUTE_MISSING_PARAM`, `MINISTA_FEATURE_CYCLE`, `MINISTA_ASSET_NOT_FOUND`, `MINISTA_RENDER_FAILED`, `MINISTA_MANIFEST_SCHEMA_UNSUPPORTED` です。人間向けformatterとJSON formatterは同じcollectionを使用し、JSON modeではprogress logをstdoutに混ぜません。

### CLI / machine-readable interface

v5 Coreの同じquery serviceを次から共有します。

- `minista check [--json]`: discovery / resolve / validation。distを生成しない
- `minista inspect [--json]`: graph / manifestの要約またはJSON
- `minista explain <route|file|artifact|diagnostic-code>`: edgeと生成理由
- `minista build`: lifecycle全体
- 将来の `@minista/mcp`: 上記query serviceのadapter。Coreの必須依存にはしない

JSON outputはcommandごとにversioned envelopeを持ちます。

```ts
interface CommandResult<T> {
  schemaVersion: "1"
  command: "check" | "inspect" | "explain" | "build"
  ok: boolean
  data: T
  diagnostics: readonly Diagnostic[]
}
```

### Public / internal type boundary

- `public/` はuser config、page/layout props、feature options、public component typeのみexport
- `core/` のgraph mutation command、adapter port、lifecycle contextはpackage rootからexportしない
- runtime implementationは `.js` / `.jsx` とJSDocで記述し、public declarationは隣接する `.d.ts` で維持する
- typecheckは `tsc --noEmit` でsourceを直接検査し、testやCLI実行の前提にcompile stepを置かない
- `JsonValue`, branded ID, discriminated unionを使用し、arbitrary user valueが必要なruntime boundaryだけ `unknown` を使う
- userがmodule augmentationしている `Metadata`, `PageProps`, `LayoutProps` は互換facadeで維持する

### Self-verification structure

```text
packages/minista/test/
├─ unit/                   # Core、graph、phase、pure feature logic
├─ fixtures/               # 最小projectと期待manifest / diagnostics
└─ integration/            # dev request、HMR、full build、public API compatibility
```

manifest snapshotだけに依存せず、graph invariant、diagnostic code、dist artifact、公開API type testを検証します。Vite experimental optionのtest matrixは通常suiteと分離し、失敗してもstable pathの品質を隠さないようにします。

## Public API compatibility summary

| API | v5方針 | 想定される差 |
| --- | --- | --- |
| `defineConfig()` | Viteの型付きfacadeとして維持 | environment用helper typeを追加可能 |
| `pluginSsg()` | lifecycle coordinatorを含むcompatibility facade | 戻り値は引き続きVite `PluginOption`; 内部hookは変更 |
| `pluginMdx()` | option shapeと移行期間中のruntime return shapeを維持し、MDX feature / Vite transformに分離 | public typeは `PluginOption` として整理するが、配列spread利用もcompatibility testで保護 |
| Image/Island/Entry/Sprite/Search | optionとcomponent importを維持 | temp path、marker、output hashの非公開挙動は保証しない |
| Svg/Comment/Beautify/Archive/Bundle | facadeを維持してphase hookへ移行 | user plugin配列順による偶発的順序は保証しない |
| `Metadata`, `PageProps`, `LayoutProps`, `StaticData` | exportとmodule augmentationを維持 | `any` はsource-compatibleな範囲でgeneric / unknown化 |
| `--oneBuild` | deprecation warning後に削除 | v5 lifecycleでは不要。移行中のみ受理 |

互換性の基準はdocumented API、option default、page/layout contract、出力URLです。`node_modules/.minista` の配置、virtual module ID、Vite plugin name、生成source名、plugin closure stateは非公開であり互換対象にしません。
