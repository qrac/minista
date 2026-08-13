# Architecture

最終確認日: 2026-08-13

> この文書は移行期間中です。「Current」は現在の `v5` branchに実装されている事実、「Target」はv5で採用するが未実装の構造です。移行完了後はTargetをCurrentに統合し、未実装事項を `roadmap.md` のみに残します。

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

通常の `minista build` は同じNode.js processで一つの `createBuilder(config, false)` を作り、App Buildのrender/client environmentを順にbuildします。`isSsrBuild` でplugin構成自体を変えるconfigはstable diagnosticを出し、同一processの `LegacyViteBuilderAdapter` がrender/clientごとのbackward-compatible environmentをbuildします。programmatic adapterが変換できないVite CLI flagを指定した場合だけ、最終compatibility fallbackとして `cross-spawn` でVite CLIを二度起動します。

```text
minista build (current programmatic path)
  └─ createBuilder({ environments: { render, client } }, false)
       ├─ builder.build(render)
       │    └─ page/layout glob entryをbundle
       ├─ prepareClient
       │    ├─ render bundleをnative import
       │    ├─ getStaticDataとReact rendererを実行
       │    └─ ArtifactStoreからclient inputを合成
       └─ builder.build(client)
            └─ HTML / assetを出力
```

CLI processは一つになり、render/client buildにはbuildId、`DiagnosticCollector`、`MemoryArtifactStore` を持つ同じbuild sessionを渡します。EntryとIslandはrendered page／snippet Artifactをこのstoreから読みます。App Builderはschema付きの単一resultを返し、CLIは成功、失敗、legacy fallbackの各経路でArtifactStoreをclearします。未対応CLI flagで別processのVite CLIへfallbackした場合だけ、従来の `.minista` 内の実行可能な `.mjs` を読みます。この外部fallbackでは親CLIがbuildIdを環境変数で両processへ渡し、client pluginがprivate `work/<buildId>` に安全なmanifest候補を書きます。親CLIは両build成功後だけ公開metadataへ昇格し、成功／失敗の両方でhandoffを削除します。`--oneBuild` は移行用escape hatchとして受理しますが、`MINISTA_CLI_ONE_BUILD_DEPRECATED` warningを出します。

App BuildではViteが全environmentのconfigをbuild前に解決するため、render結果が必要なclient inputを初回config解決時に確定できません。`ViteAppBuilderAdapter` は単一の `createBuilder()` でrender、clientを順にbuildし、その間にclient planを適用します。`createViteAppConfig()` はrender/clientのconsumerとSSR設定を明示し、`ViteEnvironmentInputAdapter` は解決済みclient environmentへnamed inputを保存的に合成します。`prepareViteClientEnvironment()` は明示的な `api.minista.prepareClient` だけを、feature descriptorのcapabilityと順序制約でscheduleして実行します。不正な依存はstructured diagnosticを持つstable errorになります。SSG、Entry、Islandはこのprotocolへ移行済みです。Islandはsnippet Artifactをrenderからclientへ渡し、EntryとIslandはrendered page Artifactからclient entryを生成します。Comment、Svg、Sprite、Beautify、Archive、Bundleのoutput hookはApp Buildのclient environmentだけに適用し、ImageとSearchのsource transformもrender/clientへ分離してrender outputを変更しません。既存の `isSsrBuild` config関数はrender用の環境設定を再評価し、Viteがenvironmentごとに受け付けるoptionを投影します。clientだけに設定されたPreact aliasはrender bundleのReact importをexternalizeして分離します。plugin名や順序がrender/clientで異なるconfigは `MINISTA_VITE_APP_CONFIG_PLUGIN_MISMATCH` を出してlegacy adapterへfallbackします。client buildのRolldown outputは直ちにCore `OutputManifest` schema v1へ変換し、code、source本文、絶対facade pathをresultへ含めません。client pluginの `api.minista.outputClaims()` はfeature descriptor、Artifact owner、file name、page URL、dependencyを明示的に返します。Vite adapterはclaimを実在するOutput Manifest entryと照合してからGraphへ適用し、missing output／ownerをstable diagnosticにします。SSG、Entry、Island、Image、Sprite、Search、Archive、Bundleのoutput claimは接続済みです。各featureがgenerate／bundle／finalize時に既に持つ参照情報を使い、file name patternや生成後の再解析でownerを推測しません。外部Vite CLI fallbackでは全pluginの`writeBundle`完了後にOutput Manifestをfilesystemと照合し、Archiveを含むclaimを収集してhandoffへ保存します。Appとlegacyのprogrammatic client buildは既存outDirを同階層のprivate backupへrenameし、成功時にbackupを削除、失敗時にpartial outputを削除して以前のoutDirを復元します。project rootまたはfilesystem rootをoutDirにする危険なtransactionは `MINISTA_OUTPUT_TRANSACTION_UNSAFE_DIR` で拒否します。通常のApp Buildとprogrammatic legacy fallbackの成功時はbuild sessionのProject Graphから安全なprojectionを作り、安定したkey順の `.minista/manifest.json` と `.minista/diagnostics.json` をatomic replaceします。plugin構成差によるfallback warningもlegacy sessionのdiagnosticsへ引き継ぎます。実際のVite 8.2.1で全compatibility pluginを含むCLI fixture、Preact fixture、plugin mismatch fixtureを確認済みです。

### Current dev lifecycle

通常のdev CLIは外部Vite processを起動せず、`ViteDevServerAdapter` が `createServer({ appType: "custom" })`、listen、URL表示、CLI shortcut、closeを所有します。root、config、mode、base、host、port、open、CORSなどの一般的なdev flagはprogrammatic configへ変換し、未対応flagだけ外部Vite CLIへfallbackします。

`pluginSsg()` は引き続きVite middlewareを登録しますが、module評価は `ViteDevModuleEvaluator` を通じて `RunnableDevEnvironment.runner.import()` を使用します。adapterはrunnable environmentのguard、module invalidation、stacktrace補正を所有し、Core側にはViteの型を公開しません。最初のrequestでroute解決と全page renderを行い、世代管理付きの `DevPageCache` がsnapshotを後続requestで再利用します。page/layoutの依存moduleに到達するhot updateではsnapshotを破棄し、次のrequestで再評価します。`ViteDevUpdateAdapter` は変更moduleのimporter chainをroute sourceへ投影し、`LegacySsgRouteCache` は影響routeだけRouteNode／PageNodeと `getStaticData()` を再解決します。Project Graph全体はcache entryから毎回再構成し、duplicate routeなどのglobal invariantを再検証します。`DevRenderCache` も影響RouteNode配下のPageNodeだけを破棄し、layout変更またはrouteを限定できない変更では全pageを破棄します。

Image / Sprite / Islandなども `transformIndexHtml()` でHTMLを解析・置換し、開発用sourceやassetを `.minista` に生成します。Imageはdomainの参照収集とdocument composeを使い、Node adapterが生成した画像assetだけを `.minista` に保存します。IslandとSearchも共有module evaluatorから `virtual:ssg-pages` をimportし、plugin／CLIからの `ssrLoadModule()` 直接利用は除去済みです。

`pluginSsg()` のHMRは `hotUpdate` から `ViteDevUpdateAdapter` を呼び、environment別module graphの存在確認・invalidationと `environment.hot` によるreloadをadapterへ閉じています。page固有のdocument変更ではdev HTMLへ注入したlistenerへ影響PageNodeのURLだけを送り、layout変更またはrouteを限定できない変更だけ標準full reloadを送ります。Spriteは `DevSpritePageIndex` にsource directoryと参照ページURL、Imageは `DevImagePageIndex` にlocal sourceと参照ページURLのedgeを保存し、source変更時は該当ページだけをreloadします。plugin内の `server.ws`、mixed `server.environments`、module graph直接操作は除去済みです。route source／PageNodeとSprite／Image Artifactのinvalidation対応付けは実装済みです。

### Current data model

実際のbuild plugin間で共有される中心的な値は引き続き次の `SsgPage` です。

```ts
type SsgPage = {
  url: string
  fileName: string
  html: string
}
```

一方、v5のside-by-side基盤として `ProjectGraph`、branded node ID、RouteNode、PageNode、AssetNode、IslandNode、ImageNode、BuildArtifactは実装済みです。Core、SSG feature、React/Vite adapterのruntime実装はJavaScript + JSDocへ移行済みで、型専用の隣接 `.d.ts` とともにsourceから直接実行します。`check` / `inspect` / `explain` に加え、legacy SSG build/devのroute discoveryと `getStaticData()` 解決もRoute/Page Graphを使用します。Comment、Svg、Beautify、Archive、Search、Sprite、Image、Entry、Bundle、Islandのdomain featureは明示phaseへ移行しましたが、Vite build全体はまだ旧 `SsgPage` contractを使用しています。

各公開pluginは `api.minista.feature` に `id`, `apiVersion`, `options`, `provides`, `requires` と必要な順序制約を持つmachine-readable metadataを公開し始めています。domain phase schedulerへの接続は未完了です。

### Current feature coupling

| Producer / consumer | 実際のcontract | 問題 |
| --- | --- | --- |
| CLI → SSG | 二つのbackward-compatible Vite Builderと `build.ssr` | config解決とVite lifecycleがrender/clientで分かれる |
| SSG → fallback時のEntry／Island | `.minista/ssg/*.mjs` の `ssgPages` | 型なし、実行可能temp file、前回buildの残存を区別できない |
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
- public manifestの型、安全なprojection、安定serializer、atomic filesystem writerは実装済み。通常のApp Build、programmatic legacy fallback、別processの外部Vite CLI fallbackから `.minista/manifest.json` とbuild diagnosticsを出力し、`check` の成功／失敗時にも `.minista/diagnostics.json` を出力する
- representative fixture build、project command、Core/feature/adapterのunit testを追加済み
- legacy SSGはReact 19で `ReactStaticRenderer`、Preact aliasまたはReact 18で `ReactRenderToStringRenderer` を選択し、Headを含むpage treeを1回だけrenderする
- parser非依存の `HtmlDocument` contract、build session内の `HtmlDocumentStore`、`node-html-parser` adapterを実装し、markerとgraph node IDをbindできる
- CommentとSvgのdomain featureは明示的なcompose phaseで共有documentを変更し、compatibility facadeも同じ変換を使用する
- Svgのfilesystem読込、SVGO、fragment parseは `NodeSvgSourceResolver` adapterに閉じている
- Beautifyはimage preload除去をcompose、既存出力の整形をfinalizeで行い、Emitterの明示的な `replace()` だけを使用する
- Archiveはfinalizeでarchive出力を追加し、filesystemとarchive libraryは `NodeArchiveBuilder` adapterに閉じている
- Searchはanalyzeでpage解析Artifact、generateでSearchData Artifactを作り、composeで相対階層属性を共有documentへ反映する
- SearchのDOM tree走査は `NodeSearchDocumentAnalyzer` adapterへ閉じ、同じparse treeを再利用する
- Search compatibility facadeはbuild済みdocumentからJSON assetを直接生成し、SSGのexecutable temp moduleを読まない
- Spriteはanalyzeで参照Artifact、generateでSVG sprite ArtifactとAssetNodeを作り、composeで確定URLを共有documentへ反映する
- Spriteのfilesystem読込、SVGO、symbol生成は `NodeSpriteBuilder` adapterへ閉じ、compatibility facadeはbuild済みdocumentからSVG assetを直接emitする
- Imageはanalyzeでmarker参照Artifact、generateで画像Artifact・plan・ImageNode、composeで `src` / `srcset` / sizeを共有documentへ反映する
- Image compatibility facadeはdev／buildの両方でdomainの参照収集と属性反映を再利用し、SSGのexecutable temp moduleやfacade固有のrecipe mapを使用しない
- `NodeImageGenerator` はlocal／remote source、Sharp変換、source contentと生成patternのhashで無効化するfilesystem cacheをImageGenerator portへ適合させる
- Entryはanalyzeでroot asset参照Artifact、bundleでentry bundle plan、composeで確定URLとimported CSSを共有documentへ反映する
- Entry compatibility facadeはdomainの参照収集とcomposeを再利用し、通常buildのconfig-time inputはbuild-session ArtifactStoreのrendered page Artifactから確定する。別process fallbackだけはSSGのexecutable temp moduleを読む
- Bundleはanalyzeで対象page Artifact、bundleでclient bundle plan、composeでCSSと相対画像URLを共有documentへ反映する
- Bundle compatibility facadeはVite固有のglob entryとoutput探索を維持し、document変更だけをdomain composeへ委譲する
- Islandはanalyzeでsnippet参照Artifact、generateでsnippet／entry source plan、bundleでclient output plan、composeでmarkerとCSS／script URLを共有documentへ反映する
- IslandのSWC source transformとNode用entry code生成はadapterへ分離し、通常buildのrendered page／snippet連携はbuild-session ArtifactStoreを使用する
- JavaScript implementationと `.d.ts` が分離し、`StaticData.props` などに `any` が残る

### Current v5 migration directories

次は実装済みです。

```text
packages/minista/src/
├─ core/                   # graph, lifecycle, diagnostics, artifacts, manifest, query, ports
├─ features/               # SSGとComment/Svg/Beautify/Archive/Search/Sprite/Image/Entry/Bundle/Islandのdomain phase
└─ adapters/
   ├─ archive/             # Node.js archive生成
   ├─ html/                # HtmlDocumentのnode-html-parser実装
   ├─ image/               # Node.js画像読込・Sharp変換・cache
   ├─ react/               # renderToString / prerenderToNodeStream
   ├─ sprite/              # Node.js SVG sprite生成
   └─ vite/                # project query、SSG projection、Vite build/dev adapter
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
  optionalAfter?: readonly FeatureId[]
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

phase内のfeature順はuserのVite plugin配列ではなく、`requires`, `provides`, `after`, `optionalAfter` のdependency graphをtopological sortして決めます。循環、capability不足、同じartifactの競合はdiagnosticにします。`after` は必須の順序依存、`optionalAfter` は対象featureが登録されている場合だけ有効な順序依存です。data dependencyはcapability / graph edgeで表現します。

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
| `finalize` | beautify、archive、summary | 既存出力はEmitterの `replace()`、追加出力は `emit()` のみ許可 |

Core runnerはphase、feature、node IDを含むtrace eventを発行します。同じinput/config/content hashに対するphaseは将来cache可能にしますが、初期実装では正しさを優先します。

### Artifact Storeとmanifest

`.minista` は暗黙の一時ディレクトリから、明示contractを持つworkspaceに変えます。

```text
.minista/
├─ manifest.json           # public machine-readable snapshot
├─ diagnostics.json        # 直近のcheckまたは成功したApp Buildのdiagnostics snapshot
└─ work/                   # private, buildId単位、削除可能
   └─ <buildId>/
      ├─ render/
      ├─ generated/
      └─ client/
```

`manifest.json` はJSON dataのみで、JavaScript moduleをimportしません。`schemaVersion`, `generator`, `project`, `features`, `routes`, `pages`, `assets`, `artifacts`, `outputs`, `diagnosticSummary`, `createdAt` を持ちます。`outputs` はCore Output Manifestのallowlist projectionで、logical ID、kind、相対file name、URL、byte size、entry/import関係だけを含みます。Pageは対応するHTML outputをfile nameとURLで参照します。絶対path、秘密情報、page propsの任意データ、bundle code、source本文は出力しません。manifest writerは安定key orderとatomic replaceを使います。

`diagnostics.json` は `schemaVersion`, `generator`, `command`, `buildId`, `summary`, `diagnostics`, `createdAt` を持つworkspace snapshotです。`check` はvalidation errorを含む終了結果を保存し、App Buildは成功時のsession diagnosticsを保存します。公開Project Manifestとは異なり配布用artifactではありません。両writerは共通のstable JSON serializerとatomic workspace writerを使います。

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
- `minista inspect --manifest [--json]`: `.minista/manifest.json` だけを読み、Vite serverやuser moduleを実行しない。missing、invalid JSON、unsupported schema versionはstable diagnosticを返す
- `minista explain <route|file|artifact|diagnostic-code>`: edgeと生成理由
- `minista build`: lifecycle全体
- `minista/internal/query`: 公開manifestだけを読むtool adapter向けread-only package boundary
- 将来の `@minista/mcp`: `minista/internal/query`のadapter。Coreの必須依存にはしない

JSON outputはcommandごとにversioned envelopeを持ちます。

Project Manifest readerはparse前に明示的なmigration registryを一段ずつ適用します。v1が最初の公開schemaなのでbuilt-in registryは空です。未登録versionは `MINISTA_MANIFEST_VERSION_UNSUPPORTED`、cycle、重複migration、不正な変換結果は `MINISTA_MANIFEST_MIGRATION_FAILED` として区別します。

`minista/internal/query`は`queryProject()`と純粋な`queryProjectManifest()`を公開し、`inspect`または`trace-page` requestを受けます。`trace-page`はPage ID／URLからRoute、consumer Asset、対応Artifact、最終Outputを返します。user moduleやViteを起動せず、filesystemへの書込みも行いません。CLIの`inspect --manifest`も同じboundaryを使用します。不正なrequestは`MINISTA_QUERY_REQUEST_INVALID`です。

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
- `internal/query`は将来のtool adapter向けに明示exportするが、一般利用者向けroot APIとはversion管理を分ける
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
| `--oneBuild` | `MINISTA_CLI_ONE_BUILD_DEPRECATED` warningを実装済み。次majorで削除 | v5 lifecycleでは不要。移行中のみ受理 |

互換性の基準はdocumented API、option default、page/layout contract、出力URLです。`node_modules/.minista` の配置、virtual module ID、Vite plugin name、生成source名、plugin closure stateは非公開であり互換対象にしません。
