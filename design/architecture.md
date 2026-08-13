# Architecture

最終確認日: 2026-08-13

> この文書は現在の`v5` branchに実装されている事実だけを記載します。未実装、上流待ち、experimental、移行条件は`roadmap.md`を参照してください。

## 現在実装されている構造

### パッケージと公開API

monorepoは主に次で構成されています。

- `packages/minista`: SSG本体。実装はJavaScript、型は隣接する `.d.ts`
- `packages/create-minista`: starter生成CLI
- `docs`: minista自身で構築する公開ドキュメント
- `playground`: pluginごとの動作確認プロジェクト
- `packages/minista/test`: pure utilityを中心としたVitest test

package runtime entryは `src/node.js` です。CLI、test、workspace packageは `src/` のJavaScriptを直接実行し、通常の開発にcompile済み `dist/` を必要としません。公開型は `src/*.d.ts` を参照します。`src/node.js` はViteの `defineConfig` と12個の `pluginXXX()` をexportし、`pluginMdx()` を除く各機能は、状態をclosureに持つVite pluginとして実装されています。

### Build lifecycle

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

CLI processは一つになり、render/client buildにはbuildId、`DiagnosticCollector`、`MemoryArtifactStore` を持つ同じbuild sessionを渡します。EntryとIslandはrendered page／snippet Artifactをこのstoreから読みます。App Builderはschema付きの単一resultを返し、CLIは成功、失敗、legacy fallbackの各経路でArtifactStoreをclearします。未対応CLI flagで別processのVite CLIへfallbackする場合は、buildIdで隔離したprivate `work/<buildId>/external` のschema付きJSONでrendered pagesとIsland snippetsを渡します。client pluginは同じscopeへ安全なmanifest候補を書き、親CLIは両process成功後だけ公開metadataへ昇格します。成功／失敗の両方でhandoff全体を削除します。旧`--oneBuild` optionはv5で削除し、指定時は`MINISTA_CLI_OPTION_REMOVED` errorで終了します。

App BuildではViteが全environmentのconfigをbuild前に解決するため、render結果が必要なclient inputを初回config解決時に確定できません。`ViteAppBuilderAdapter` は単一の `createBuilder()` でrender、clientを順にbuildし、その間にclient planを適用します。`createViteAppConfig()` はrender/clientのconsumerとSSR設定を明示し、`ViteEnvironmentInputAdapter` は解決済みclient environmentへnamed inputを保存的に合成します。`prepareViteClientEnvironment()` は明示的な `api.minista.prepareClient` だけを、feature descriptorのcapabilityと順序制約でscheduleして実行します。不正な依存はstructured diagnosticを持つstable errorになります。SSG、Entry、Islandはこのprotocolへ移行済みです。Islandはsnippet Artifactをrenderからclientへ渡し、EntryとIslandはrendered page Artifactからclient entryを生成します。Comment、Svg、Sprite、Beautify、Archive、Bundleのoutput hookはApp Buildのclient environmentだけに適用し、ImageとSearchのsource transformもrender/clientへ分離してrender outputを変更しません。既存の `isSsrBuild` config関数はrender用の環境設定を再評価し、Viteがenvironmentごとに受け付けるoptionを投影します。clientだけに設定されたPreact aliasはrender bundleのReact importをexternalizeして分離します。plugin名や順序がrender/clientで異なるconfigは `MINISTA_VITE_APP_CONFIG_PLUGIN_MISMATCH` を出してlegacy adapterへfallbackします。App／legacy adapterが受けた任意のVite／Rolldown build errorは `MINISTA_VITE_BUILD_FAILED` に正規化し、environment、bundle phase、project root内に限ったsource locationをdiagnosticとしてbuild sessionとprogrammatic callerへ返します。client buildのRolldown outputは直ちにCore `OutputManifest` schema v1へ変換し、code、source本文、絶対facade pathをresultへ含めません。client pluginの `api.minista.outputClaims()` はfeature descriptor、Artifact owner、file name、page URL、dependencyを明示的に返します。Vite adapterはclaimを実在するOutput Manifest entryと照合してからGraphへ適用し、missing output／ownerをstable diagnosticにします。SSG、Entry、Island、Image、Sprite、Search、Archive、Bundleのoutput claimは接続済みです。各featureがgenerate／bundle／finalize時に既に持つ参照情報を使い、file name patternや生成後の再解析でownerを推測しません。外部Vite CLI fallbackでは全pluginの`writeBundle`完了後にOutput Manifestをfilesystemと照合し、Archiveを含むclaimを収集してhandoffへ保存します。Appとlegacyのprogrammatic client buildは既存outDirを同階層のprivate backupへrenameし、成功時にbackupを削除、失敗時にpartial outputを削除して以前のoutDirを復元します。project rootまたはfilesystem rootをoutDirにする危険なtransactionは `MINISTA_OUTPUT_TRANSACTION_UNSAFE_DIR` で拒否します。通常のApp Buildとprogrammatic legacy fallbackの成功時はbuild sessionのProject Graphから安全なprojectionを作り、安定したkey順の `.minista/manifest.json` と `.minista/diagnostics.json` をatomic replaceします。plugin構成差によるfallback warningもlegacy sessionのdiagnosticsへ引き継ぎます。実際のVite 8.2.1で全compatibility pluginを含むCLI fixture、Preact fixture、plugin mismatch fixtureを確認済みです。

### Dev lifecycle

通常のdev CLIは外部Vite processを起動せず、`ViteDevServerAdapter` が `createServer({ appType: "custom" })`、listen、URL表示、CLI shortcut、closeを所有します。create、listen、起動後設定、closeの失敗はoperationを持つ `MINISTA_VITE_DEV_SERVER_FAILED` diagnosticへ変換します。`ViteDevModuleEvaluator` はModuleRunner import失敗を `MINISTA_VITE_DEV_MODULE_FAILED` へ変換し、environment、module ID、安全なproject相対locationを保持します。build／devのVite error locationは同じadapterを使い、virtual moduleとproject外pathを公開locationから除外します。root、config、mode、base、host、port、open、CORSなどの一般的なdev flagはprogrammatic configへ変換し、未対応flagだけ外部Vite CLIへfallbackします。

`pluginSsg()` は引き続きVite middlewareを登録しますが、module評価は `ViteDevModuleEvaluator` を通じて `RunnableDevEnvironment.runner.import()` を使用します。adapterはrunnable environmentのguard、module invalidation、stacktrace補正を所有し、Core側にはViteの型を公開しません。最初のrequestでroute解決と全page renderを行い、世代管理付きの `DevPageCache` がsnapshotを後続requestで再利用します。page/layoutの依存moduleに到達するhot updateではsnapshotを破棄し、次のrequestで再評価します。`ViteDevUpdateAdapter` は変更moduleのimporter chainをroute sourceへ投影し、`LegacySsgRouteCache` は影響routeだけRouteNode／PageNodeと `getStaticData()` を再解決します。Project Graph全体はcache entryから毎回再構成し、duplicate routeなどのglobal invariantを再検証します。`DevRenderCache` も影響RouteNode配下のPageNodeだけを破棄し、layout変更またはrouteを限定できない変更では全pageを破棄します。

Image / Sprite / Islandなども `transformIndexHtml()` でHTMLを解析・置換し、開発用sourceやassetを `.minista` に生成します。Imageはdomainの参照収集とdocument composeを使い、Node adapterが生成した画像assetだけを `.minista` に保存します。IslandとSearchも共有module evaluatorから `virtual:ssg-pages` をimportし、plugin／CLIからの `ssrLoadModule()` 直接利用は除去済みです。

`pluginSsg()` のHMRは `hotUpdate` から `ViteDevUpdateAdapter` を呼び、environment別module graphの存在確認・invalidationと `environment.hot` によるreloadをadapterへ閉じています。page固有のdocument変更ではdev HTMLへ注入したlistenerへ影響PageNodeのURLだけを送り、layout変更またはrouteを限定できない変更だけ標準full reloadを送ります。Spriteは `DevSpritePageIndex` にsource directoryと参照ページURL、Imageは `DevImagePageIndex` にlocal sourceと参照ページURLのedgeを保存し、source変更時は該当ページだけをreloadします。plugin内の `server.ws`、mixed `server.environments`、module graph直接操作は除去済みです。route source／PageNodeとSprite／Image Artifactのinvalidation対応付けは実装済みです。

### Data model

render後の互換処理で共有する最小snapshotはdomainの`RenderedPage`です。

```ts
interface RenderedPage {
  url: string
  fileName: string
  html: string
}
```

`RenderedPage`の生成元はRoute／Page Graphとrendererであり、通常buildではArtifactStore、外部fallbackではschema付きJSONに保存します。`ViteBuildDataReader`が保存方式の差を吸収し、Entry／Islandはdomain snapshotだけに依存します。SSG／Searchのdev virtual moduleも同じ型を使用し、旧`SsgPage`型は削除済みです。Project Graph、branded node ID、AssetNode、IslandNode、ImageNode、BuildArtifact、各domain featureの明示phaseも実装済みです。production outputを持つfeature facadeはCore lifecycle runnerへ接続済みです。

各公開pluginは`api.minista.feature`に`id`、`apiVersion`、`options`、`provides`、`requires`と必要な順序制約を持つmachine-readable metadataを公開します。production phaseはdependency schedulerを持つCore runnerから実行されます。

### 残っているcompatibility境界

| Producer / consumer | 現在のcontract | 残る境界 |
| --- | --- | --- |
| CLI → SSG | App Build。非対応config／flagではprogrammaticまたは外部CLI fallback | fallbackではrender/client lifecycleが分かれる |
| SSG → fallback時のEntry／Island | buildId scopeのschema付きJSON snapshot | lifecycleとdiagnosticsはrender/client processに分かれる |
| Page → feature | source transformが付けるHTML markerとDocument Store | markerはcompatibility facade内の非公開protocolとして残る |
| Vite output → feature | facadeごとの`ViteCompatibilityLifecycle`へoutputを投影 | Vite hookごとにHTMLを再parseし、build全体で単一のDocument Storeではない |
| dev feature | `transformIndexHtml()`とfeature別の差分cache／page index | productionと同じ長寿命lifecycleではない |
| MDX | `@mdx-js/rollup`を包むcompiler adapter | document／output phaseを持たずVite transformとして残る |

module-level global variableはほぼ使われていませんが、plugin instance closureのmutable stateはenvironment単位にkey化されていません。このためplugin instanceをenvironment間で共有する構成には対応していません。

### Diagnostics and tests

- Core lifecycle、project command、manifest、主要adapterはstructured diagnosticを生成する。runnerはadapter errorの単一 `diagnostic` または複数 `diagnostics` を保持し、不足するphaseとfeatureだけを補完する。programmatic buildのVite／Rolldown errorは `MINISTA_VITE_BUILD_FAILED`、外部CLI fallbackのprocess errorは `MINISTA_VITE_CLI_FAILED`、Archiver errorは `MINISTA_ARCHIVE_FAILED` へadapterで正規化する。programmatic build失敗時はsessionとerrorが持つdiagnosticを重複排除し、build ID付きworkspace snapshotへ保存する。一部の外部library errorと外部process内の詳細は例外またはsubprocess stderrとして伝播する
- Coreの `DiagnosticCollector` とstable diagnostic codeは実装済み
- `check [--json]`, `inspect [--json]`, `explain [--json]` は実装済みで、Vite ModuleRunnerによりpage moduleと `getStaticData()` を評価する
- public manifestの型、安全なprojection、安定serializer、atomic filesystem writerは実装済み。通常のApp Build、programmatic legacy fallback、別processの外部Vite CLI fallbackから `.minista/manifest.json` とbuild diagnosticsを出力し、`check` の成功／失敗時にも `.minista/diagnostics.json` を出力する
- representative fixture build、project command、Core/feature/adapterのunit testを追加済み
- production SSGはRoute／Page Graph snapshotを`ViteSsgRenderLifecycle` adapterで可変Graphへ復元し、Core runnerのrender phaseを実行する。React 19では`ReactStaticRenderer`、Preact aliasまたはReact 18では`ReactRenderToStringRenderer`をportとして選択し、Headを含むpage treeを1回だけrenderする。render phaseはdraftを除外した`RenderedPage` ArtifactとGraph edgeを生成し、失敗を`MINISTA_RENDER_FAILED` diagnosticにする
- parser非依存の `HtmlDocument` contract、build session内の `HtmlDocumentStore`、`node-html-parser` adapterを実装し、markerとgraph node IDをbindできる
- CommentとSvgのcompatibility facadeは`ViteCompatibilityLifecycle` adapterからCore runnerのcompose phaseを実行し、domain featureがDocument Storeを変更する
- Svgのfilesystem読込、SVGO、fragment parseは `NodeSvgSourceResolver` adapterに閉じている
- Beautify compatibility facadeはVite outputをMemoryEmitterへ投影し、Core runnerでimage preload除去のcomposeと既存出力整形のfinalizeを順に実行する
- Archive compatibility facadeはCore runnerのfinalize phaseを実行し、domain featureがarchiveをEmitterへ追加する。archive libraryは`NodeArchiveBuilder`へ閉じ、library errorを`MINISTA_ARCHIVE_FAILED`へ変換する。安全なrelative outputの書込みは`NodeOutputWriter` adapterに閉じ、directory逸脱を`MINISTA_OUTPUT_WRITE_UNSAFE_PATH`で拒否する
- Searchはanalyzeでpage解析Artifact、generateでSearchData Artifactを作り、composeで相対階層属性を共有documentへ反映する
- SearchのDOM tree走査は `NodeSearchDocumentAnalyzer` adapterへ閉じ、同じparse treeを再利用する
- Search compatibility facadeはbuild済みHTML群を`ViteCompatibilityLifecycle` adapterでPage GraphとDocument Storeへ投影し、Core runnerのanalyze／generate／composeを一括実行する。生成されたSearchData ArtifactをJSON assetとしてViteへ戻し、SSGのexecutable temp moduleを読まない
- Spriteはanalyzeで参照Artifact、generateでSVG sprite ArtifactとAssetNodeを作り、composeで確定URLを共有documentへ反映する
- Spriteのfilesystem読込、SVGO、symbol生成は `NodeSpriteBuilder` adapterへ閉じる。build時のcompatibility facadeはHTML群を`ViteCompatibilityLifecycle` adapterへ投影し、Core runnerのanalyze／generate後にSVG ArtifactをViteへemitして出力URLを解決してから、同じDocument Storeでcomposeを実行する
- Imageはanalyzeでmarker参照Artifact、generateで画像Artifact・plan・ImageNode、composeで `src` / `srcset` / sizeを共有documentへ反映する
- Image compatibility facadeはdev／buildの両方でdomainの参照収集と属性反映を再利用し、SSGのexecutable temp moduleやfacade固有のrecipe mapを使用しない。build時はHTML群を`ViteCompatibilityLifecycle` adapterへ投影し、Core runnerが画像binary Artifact、compose plan、source／file nameを持つ出力計画Artifactを生成する。facadeは出力計画に従ってVite assetを登録し、確定URLを同じDocument Storeのcomposeへ返す
- `NodeImageGenerator` はlocal／remote source、Sharp変換、source contentと生成patternのhashで無効化するfilesystem cacheをImageGenerator portへ適合させる
- Entryはanalyzeでroot asset参照Artifact、bundleでentry bundle plan、composeで確定URLとimported CSSを共有documentへ反映する
- Entry compatibility facadeは`ViteBuildDataReader`から検証済みの`RenderedPage` snapshotを受け取り、`ViteCompatibilityLifecycle` adapterのCore analyzeでroot asset参照とPage Graphの対応を収集する。client input登録とVite bundle結果の`EntryBundler` portへの返却だけをadapter責務とし、確定script／CSS URLはCore bundle／composeで共有Document Storeへ反映する。ArtifactStoreと外部JSONの選択はadapterが所有する
- Bundleはanalyzeで対象page Artifact、bundleでclient bundle plan、composeでCSSと相対画像URLを共有documentへ反映する
- Bundle compatibility facadeはVite固有のglob entryとoutput探索を維持し、確定planを`BundleBuilder` portからCore bundleへ返す。Coreはページ別output参照Artifactを生成し、同じ情報からCSS／画像のoutput claimと共有Document Storeのcomposeを行う
- Islandはanalyzeでsnippet参照Artifact、generateでsnippet／entry source plan、bundleでclient output plan、composeでmarkerとCSS／script URLを共有documentへ反映する
- IslandのSWC source transformとNode用entry code生成はadapterへ分離し、rendered page／snippetは`ViteBuildDataReader`から受け取る。`ViteCompatibilityLifecycle` adapterはsnippet Artifactを初期入力としてCore analyze／generateへ渡し、安定したsource planからclient inputを作る。Vite bundle結果はCore bundleへ返し、同じsource planとPage Graphを使ってoutput claimとmarker／CSS／script URLをCore composeで反映する。通常buildのArtifactStoreと別process fallbackのJSON差異はpluginから見えない
- JavaScript implementationと `.d.ts` が分離し、`StaticData.props` などに `any` が残る

### v5 migration directories

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

## 残存する実装上の制約

production featureのdomain phaseはCore runnerへ接続済みですが、compatibility facadeはVite hookごとに独立した短命lifecycleを作ります。そのためbuild全体を通じた単一のDocument Store、Artifact Store、traceにはまだなっていません。devもfeature別cacheと`transformIndexHtml()`を使用します。plugin instance closureのmutable stateとImage／Sprite／HTML parser由来errorの正規化は残存課題です。

## CoreとFeatureの実装contract

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
  Vite adapter, filesystem adapter, React renderer, CLI/query adapter
```

依存方向は外側からCoreへ向きます。Coreは`vite`、React、HTML parser、filesystem concrete APIをimportせず、必要な処理をport interfaceとして受け取ります。現在の物理directoryは前節の「v5 migration directories」のとおりです。`src/plugins/*`は公開compatibility facadeとしてfeatureとadapterを呼び出します。

### Project Graph

Project Graphは安定IDを持つnodeを`ProjectGraph`へ追加し、`snapshot()`で読み取り用Mapへ投影します。`ProjectGraph.fromSnapshot()`はadapter境界でsnapshotから可変Graphを復元します。

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
  source: string
  output?: OutputLocation
  dependencies: readonly ArtifactId[]
}
```

`ProjectPath` はproject root相対・POSIX separator・先頭 `/` なしに正規化します。IDはsource identityとvariant keyから決定的に生成し、配列indexやdiscovery順に依存させません。

`PageNode.props` と `metadata` はuser moduleを実行するbuild session内だけのruntime valueで、manifestへ直列化しません。これにより、現行APIで利用できるJSON以外のpropsも維持します。JSON境界では別のallowlist projectionを定義します。

HTMLを扱うfeatureは`HtmlDocument` portを通してmarkerとgraph node IDを対応付け、各compatibility lifecycle内の共有Document Storeをcompose phaseで更新します。Vite hookをまたぐ場合は次のfacadeが更新済みHTMLを再parseします。

### Feature contract

各`pluginXXX()`は内部で`MinistaFeature`を生成し、Vite hookの入出力をadapterからCore phaseへ投影します。

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
  bundle(ctx: BundleContext): Awaitable<void>
  compose(ctx: ComposeContext): Awaitable<void>
  emit(ctx: EmitContext): Awaitable<void>
  finalize(ctx: FinalizeContext): Awaitable<void>
}
```

phase内のfeature順はuserのVite plugin配列ではなく、`requires`, `provides`, `after`, `optionalAfter` のdependency graphをtopological sortして決めます。循環、capability不足、同じartifactの競合はdiagnosticにします。`after` は必須の順序依存、`optionalAfter` は対象featureが登録されている場合だけ有効な順序依存です。data dependencyはcapability / graph edgeで表現します。

### Lifecycle

Core runnerが実行するphaseは次です。

| Phase | 主な結果 | I/O / side effect |
| --- | --- | --- |
| `discover` | feature、route source、source asset | discovery adapterとGraph更新 |
| `resolve` | page instance、param、metadata、依存edge | `getStaticData` 等のuser code実行をport経由で許可 |
| `render` | page documentとrender diagnostic | renderer portを使用 |
| `analyze` | island/image/asset reference | document read、graph commandのみ |
| `generate` | generated image、sprite、search data、client entry plan | ArtifactStoreへのschema付きrecord write |
| `bundle` | Viteが返すoutput manifest | Vite adapterのみが実行 |
| `compose` | hashed URLを反映したfinal document | Document Store更新 |
| `emit` | output emission | Emitter port |
| `finalize` | beautify、archive、summary | Emitterの`replace()`または`emit()` |

Core runnerはphase、feature、node IDを含むtrace eventを発行します。

### Artifact Storeとmanifest

`.minista`は公開snapshotと外部fallback用private handoffを分離したworkspaceです。通常の同一process buildは`MemoryArtifactStore`を使用します。

```text
.minista/
├─ manifest.json           # public machine-readable snapshot
├─ diagnostics.json        # 直近のcheckまたはbuildのdiagnostics snapshot
└─ work/                   # private, buildId単位、削除可能
   └─ <buildId>/
      └─ external/         # 別process fallbackのschema付きJSON handoff
```

`manifest.json` はJSON dataのみで、JavaScript moduleをimportしません。`schemaVersion`, `generator`, `project`, `features`, `routes`, `pages`, `assets`, `artifacts`, `outputs`, `diagnosticSummary`, `createdAt` を持ちます。`outputs` はCore Output Manifestのallowlist projectionで、logical ID、kind、相対file name、URL、byte size、entry/import関係だけを含みます。Pageは対応するHTML outputをfile nameとURLで参照します。絶対path、秘密情報、page propsの任意データ、bundle code、source本文は出力しません。manifest writerは安定key orderとatomic replaceを使います。

`diagnostics.json` は `schemaVersion`, `generator`, `command`, `buildId`, `summary`, `diagnostics`, `createdAt` を持つworkspace snapshotです。`check` はvalidation errorを含む終了結果を保存し、App Buildは成功時のsession diagnosticsを保存します。外部Vite CLI fallbackは成功reportに加え、process起動／終了失敗を `MINISTA_VITE_CLI_FAILED` として保存します。公開Project Manifestとは異なり配布用artifactではありません。writerは共通のstable JSON serializerとatomic workspace writerを使います。

`work/<buildId>/external`は別process fallbackだけが使用します。buildIdを照合し、成功／失敗後に削除するため別buildの残骸を読みません。画像やIslandなどのVite入力用cache／生成sourceは公開workspaceとは分け、`node_modules/.minista`に置きます。

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

- package rootは`defineConfig()`、`pluginXXX()`、page/layout props、feature option、public component typeをexportする
- `core/`のgraph mutation API、adapter port、lifecycle contextはpackage rootからexportしない
- `internal/query`はtool adapter向けread-only subpathとして明示exportする
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

| API | 現在のv5実装 | compatibility note |
| --- | --- | --- |
| `defineConfig()` | Viteの`defineConfig`を再export | minista固有wrapperを持たない |
| `pluginSsg()` | lifecycle coordinatorを含むVite Plugin compatibility facade | 公開optionとpage/layout contractを維持 |
| `pluginMdx()` | `@mdx-js/rollup`を設定したVite Plugin配列を返す | 配列のreturn shapeをcompatibility testで保護 |
| Image/Island/Entry/Sprite/Search | optionとcomponent importを維持 | temp path、marker、output hashの非公開挙動は保証しない |
| Svg/Comment/Beautify/Archive/Bundle | facadeからCore phase hookを実行 | user plugin配列順による偶発的順序は保証しない |
| `Metadata`, `PageProps`, `LayoutProps`, `StaticData` | exportとmodule augmentationを維持 | 一部のruntime互換境界には`any`が残る |
| `--oneBuild` | v5で削除し、`MINISTA_CLI_OPTION_REMOVED` errorを返す | 既定buildが単一App Build lifecycleを使用するため代替optionは不要 |

互換性の基準はdocumented API、option default、page/layout contract、出力URLです。`node_modules/.minista` の配置、virtual module ID、Vite plugin name、生成source名、plugin closure stateは非公開であり互換対象にしません。
