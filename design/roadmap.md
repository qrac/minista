# v5 roadmap

最終確認日: 2026-08-13

この文書には未実装の計画、上流待ち、experimental機能、移行完了条件を記載します。各段階は小さくmerge可能にし、公開APIと出力互換性をfixtureで固定してから内部を差し替えます。

## Guiding constraints

- 一度に全pluginを書き換えない
- 現行buildとv5 lifecycleをfixtureごとに比較できる期間を持つ
- public facadeとinternal feature contractを同じcommitで切り替えない
- Vite experimental APIが変わってもCore / graph schemaを変更せずadapterだけで追従できる状態を保つ
- manifest schemaはcode internal typeより小さく、秘密情報とarbitrary propsを含めない

## Stage 0: baselineを固定する

進捗: representative fixtureにSSG、Head、Image、Entry、Island、Searchをまとめ、現行HTML / asset / executable temp handoffをintegration testで固定しました。全pluginのruntime exportとfeature metadataも検証しています。公開optionのcompile-time type testとfailure fixtureの拡充は継続します。

最初に実装すべき段階です。

- playgroundから代表fixtureを選び `test/fixtures` に固定する
- current buildのHTML、asset、island、image、search outputをgolden dataとして記録する
- `pluginXXX()` のexport / option type / defaultをtype testにする
- 二回buildとdev requestのintegration harnessを追加する
- current `.minista` producer / consumerをtest名とmatrixに明記する
- build failure、dynamic route param不足、重複routeの現状挙動を記録する

完了条件: 内部変更なしでもcompatibility suiteがcurrent outputを再現し、差分をレビューできる。

## Stage 1: Core skeletonとJavaScript + JSDoc移行

進捗: 完了。diagnostics、graph、lifecycle scheduler/runner、memory ArtifactStore/Emitter、manifest projection、query service、port interfaceをJavaScript + JSDocで実装しました。Core、SSG feature、React/Vite adapterのruntime `.ts` は残っておらず、事前buildなしでCLIとunit/integration testを実行できます。

- `core/diagnostics`, `core/graph`, `core/lifecycle`, `core/artifacts` を追加
- branded ID、ProjectPath、JsonValue、Diagnostic、phase eventを実装
- graph invariantとphase schedulerのpure unit testを追加
- `MemoryArtifactStore` とtest用 `MemoryEmitter` を先に作る
- runtime sourceを直接実行し、JSDocと隣接 `.d.ts` を `tsc --noEmit` で検査する方針を確立
- 初期TypeScript prototypeをJavaScript + JSDocへ移行

この段階では現行pluginのoutputを変更しません。Coreをside-by-sideで構築します。

完了条件: Vite / React / filesystemをimportしないCore unit testが事前buildなしで通り、runtime implementationに `.ts` が残っていない。

## Stage 2: discovery / route / page graph

進捗: 完了。route discovery、param parser、PageNode resolution、`getStaticData()` error/missing param diagnostics、ModuleEvaluator portを実装しました。CLIの `check`, `inspect`, `explain` はVite ModuleRunner adapterを通じて実際のpage moduleを評価します。legacy SSG build/devもcompatibility adapterを通じてRoute/Page Graphから現行renderer用pageへ投影します。

- SSGのglob code generationをroute discovery serviceへ移す
- route pattern parserとparam validationをpure function化
- `getStaticData` の実行を `ModuleEvaluator` portへ分離
- RouteNodeとPageNodeを生成し、現行 `SsgPage` へcompatibility projectionする
- `minista check` と `check --json` をdiscovery / resolve範囲で追加
- duplicate route、missing param、invalid static dataをstructured diagnostic化

完了条件: current rendererを使ったまま、全pageがgraphから列挙される。現行URLとdraft挙動がfixtureで一致する。

## Stage 3: rendererとdocument composition

進捗: 完了。async `StaticRenderer` port、compatibility用 `ReactRenderToStringRenderer`、React 19 `prerenderToNodeStream()` を使う `ReactStaticRenderer` を追加しました。React 19ではstatic rendererをdefaultとし、Preact aliasを検出した場合とReact 18で `react-dom/static` を読み込めない場合はcompatibility rendererへ戻します。Suspense、`useId`、画像preload、render error、Head、doctype、実際のPreact aliasとIsland buildのfixtureを実装済みです。parser非依存の `HtmlDocument` contract、build session内の `HtmlDocumentStore`、`node-html-parser` adapterを追加し、markerとgraph node IDをbindしてから1回serializeできるcomposition入口を実装しました。

- `StaticRenderer` portを追加し、まずcurrent `renderToString` adapterを移設
- Head / html / body attributeのcompatibility testを拡充
- React 19の `prerenderToNodeStream` adapterを追加
- Suspense、error、preload、doctype、`useId`、Preact aliasの差分をfixtureで検証
- feature markerとgraph node IDを対応させる `HtmlDocument` abstractionを追加

default rendererの切替条件:

1. React 19 fixtureのoutputが互換policy内である
2. `Head` の一回render semanticsが維持される
3. Preact alias使用時はcurrent fallbackが明示される
4. stream errorが `MINISTA_RENDER_FAILED` に変換される

React公式はNode.jsではWeb Stream版 `prerender()` より `prerenderToNodeStream()` を推奨しているため、Node adapterは後者を第一候補にします。API名を `ReactSsrRenderer` にはせず、SSGの実態に合わせ `ReactStaticRenderer` とします。

## Stage 4: featureを明示phaseへ移す

進捗: 全公開pluginにmachine-readable feature metadata (`id`, `apiVersion`, `options`, `provides`, `requires`、必要な場合は `optionalAfter`) を追加しました。CommentとSvgは明示的な `compose` hookへ移し、Beautifyはimage preload除去を `compose`、出力整形を `finalize` へ分離しました。Archiveは `finalize` hookへ移し、Beautifyが存在する場合だけ後続する `optionalAfter` を宣言します。Search、Sprite、Imageはpage単位の参照解析を `analyze`、SearchData／sprite／image Artifact生成を `generate`、確定URLや相対階層属性の反映を `compose` へ分離しました。各compatibility facadeも参照収集・document変換のdomain処理を使用します。Svg、Search、Spriteのparser／filesystem固有処理とArchive生成はNode adapterへ分離し、ImageにはSharp、remote download、内容hashで無効化するfilesystem cacheを実装する `NodeImageGenerator` を追加しました。Search、Sprite、Imageのfacadeは `.minista/ssg/*.mjs` や一時Vite entryを使用せず、build済みdocumentから成果物を直接emitします。Imageのdev／build経路は同じgeneratorとdocument composeを使用し、facadeからmutable recipe/cache stateを除去しました。Vite build全体のdomain lifecycle接続と、その他のfeature移設は未完了です。

移行順はdependencyが少ないものから進めます。

1. Comment / Svg: compose phase
2. Beautify / Archive: finalize phase
3. Search: analyze + generate
4. Sprite / Image: analyze + generate + compose
5. Entry / Bundle: analyze + bundle + compose
6. Island: source transform + analyze + generate + bundle + compose

各featureで行うこと:

- current optionをそのまま受けるpublic facadeを維持
- closure stateをphase context / graph nodeへ移す
- `.minista/ssg/*.mjs` の読込を削除
- HTMLの再parseを一つのdocument composition pipelineに統合
- capabilityとartifact ownershipを宣言
- current output比較testとfeature unit testを追加

完了条件: SSG以外のfeatureが `SsgPage[]` temp moduleをimportしない。

## Stage 5: Vite app build adapter

進捗: 最初の移行として、通常buildは二つのVite CLI processではなく、同一processのprogrammatic `build()` を順次呼ぶ `LegacyViteBuildAdapter` へ変更済みです。未対応CLI flagのみ従来fallbackを使用します。`createBuilder()` への切替は、client pluginのconfig-time temp importを除去した後に行います。

- CLIを `spawn("vite")` 二回からprogrammatic Minista application runnerへ変更
- Vite configに `render` / `client` environmentを構成
- `createBuilder()` + `buildApp()` で一つのlifecycleを開始
- render environmentを先にbuildし、native importでbuild-time moduleを評価
- graph / generated entry planを明示ArtifactStoreに保存
- client environmentは安定したvirtual entryをinputとし、graph planからisland / asset entryを解決
- output manifestをCoreのcompose / emitへ返す
- failure時のbuildId cleanupとpartial output policyを追加
- `--oneBuild` にdeprecation diagnosticを出す

Environment APIはRC、`createBuilder` / `buildApp` hookはVite 8.2.1の型上experimentalです。そのためadapterのcompatibility testとVite minor pinning policyを設け、旧二回buildを一つのminor releaseのfallbackとして残してから削除します。

完了条件: `minista build` がVite CLIを二回spawnせず、render → client → compose → emitを一つのresult / diagnostic collectionで返す。

## Stage 6: ModuleRunner dev adapter

- dev CLIをprogrammatic `createServer({ appType: "custom" })` に移す
- `render` environmentの `RunnableDevEnvironment.runner.import()` でpage moduleを評価
- requestごとに全pagesを再評価せず、route / module dependency単位でcache
- environmentごとのmodule graphと `hotUpdate` を使用
- source change → affected route/page/artifact edgeをgraphで説明可能にする
- HMR不能なdocument changeのみ明示的full reloadにする
- `server.ssrLoadModule`, mixed `server.moduleGraph`, `server.ws` 直接利用をadapterから削除

完了条件: build用render bundleを生成せずにdev renderingが動作し、page/layout/static dataの変更が該当graph nodeをinvalidationする。

## Stage 7: manifest / inspect / explain

- `.minista/manifest.json` schema v1とatomic writerを実装
- absolute path / arbitrary props / secret-like configのredaction testを追加
- `inspect`, `inspect --json`, `explain` をCore query service上に実装
- JSON stdoutとlog stderrを分離
- manifest migration / unsupported version diagnosticを実装
- 将来の `@minista/mcp` が使用できるread-only query APIをinternal package boundaryとして整理

完了条件: source全体を解析しなくてもroute → page → generated asset → outputの関係をJSONから追える。

## Stage 8: compatibility facade cleanup

- runtime implementationを `.js` / `.jsx` + JSDocに統一
- public APIの隣接 `.d.ts` とinternal JSDoc typeを整理
- old `src/plugins` implementation、`--oneBuild`、executable temp moduleを削除
- public docsをv5 lifecycleとcommandに更新
- `architecture.md` のTargetをCurrentに統合
- roadmapから完了済みの詳細をrelease note / ADRへ移す

## Experimental tracks

### Bundled Dev

stable dev pathの完了後に別matrixで試します。

- user opt-inの `experimental.bundledDev: true` をclient environmentへだけ渡す
- Coreはbundled / unbundledを知らず、Vite adapterのcapabilityとして扱う
- render environmentは初期状態で `isBundled: false`
- third-party plugin、virtual entry、Island HMR、custom HTML transformを重点検証

default化条件: Viteがstableと宣言し、主要fixtureとthird-party plugin matrixが通常devと同じcontractを満たすこと。

### shared plugins / shared config build

`builder.sharedPlugins` / `sharedConfigBuild` は初期実装では使用しません。phase間共有はProject Graph / ArtifactStoreの明示protocolで行います。Viteがstable化し、process内cacheが実測で必要になった場合だけadapter optimizationとして再検討します。

### MCP

v5初期要件ではありません。CLI / JSONと同じread-only query serviceが安定し、manifest schema v1を少なくとも一つのminor release維持した後に検討します。

## Risk register

| Risk | Mitigation |
| --- | --- |
| Vite RC / experimental APIの破壊的変更 | adapter隔離、minor matrix、fallback lifecycle、CoreにVite typeを入れない |
| HeadとReact static APIの一回render semantics | renderer contract、専用fixture、default切替gate |
| plugin outputの微妙な順序差 | golden integration outputとphase dependencyの明文化 |
| manifestにuser data / absolute pathが漏れる | allowlist serializerとredaction test |
| graphが巨大化する | read model分割、ID reference、inspect projection、content hash cacheは後段 |
| dual implementation期間の保守負担 | feature単位の短い移行、compatibility projection、削除条件を各stageに設定 |

## First implementation step

最初のcode changeはStage 0のcompatibility harnessです。特に `pluginSsg + pluginImage + pluginIsland + pluginEntry + pluginSearch` を含むfixtureで、現行二回buildのoutputと `.minista` handoffを固定します。これがないままCore skeletonから始めると、「内部改善」と「利用者から見た破壊」を区別できません。
