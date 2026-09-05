# Vite boundary

最終確認日: 2026-08-14

確認対象: repository lockfileのVite 8.2.1、およびVite / React公式資料

## Boundary rule

ViteはMinista Coreではなくadapterです。

Coreが要求するport:

- `ModuleEvaluator`: user page/layout/static data moduleを評価する
- `Bundler`: client / render entryとasset planをbundleする
- `DevModuleGraph`: file changeとgraph nodeのinvalidationを結び付ける
- `OutputManifest`: logical artifact IDとhashed output URLを対応付ける
- `HtmlDevTransform`: Vite / third-party pluginのHTML transformが必要な場合に適用する

Vite adapterだけが `vite` の `Environment`, `ViteBuilder`, `RunnableDevEnvironment`, plugin hook、Rolldown output typeを参照します。Coreのpublic schemaにVite module ID、Rollup/Rolldown chunk object、`ResolvedConfig` を保存しません。

## 2026-08-14時点のAPI status

| API / 機能 | 公式status | v5の扱い |
| --- | --- | --- |
| Vite 8 / Rolldown | stable major。Vite 8はproduction bundlerをRolldownに統一 | production adapterの前提。Rollup固有名称を新Core APIに使わない |
| Environment API | Release Candidate。major間の安定を目指すが一部APIはexperimental | render/client modelに採用。adapterに隔離しversion matrixを持つ |
| `RunnableDevEnvironment.runner.import()` / ModuleRunner | Environment APIのmodern SSR evaluation path。server module runner factory自体にはexperimental表記あり | default dev evaluation候補。`isRunnableDevEnvironment` guardを必須にする |
| App Build (`builder: {}`, `vite build --app`) | Environment API framework API。将来default予定 | Minista CLIはprogrammatic pathを所有する |
| `createBuilder()` | Vite 8.2.1 type declarationで `@experimental` | v5 adapterで採用するがminor version testとfallbackを持つ |
| `buildApp` hook | Vite 8.2.1 type declarationで `@experimental` | orchestration補助。Core lifecycle自体をhook semanticsに依存させない |
| `builder.sharedConfigBuild`, `sharedPlugins` | experimental | 初期不採用 |
| `this.environment`, environment module graph, `hotUpdate` | Environment API migration path | adapter内で採用。stateはenvironment単位に分離 |
| `perEnvironmentState()` | Vite 8.2.1 type declarationで `@experimental` | Core前提にせず、adapter所有の互換state storeを使用 |
| `transformIndexHtml()` hook context | Vite 8.2.1ではenvironmentを公開せず、serverもoptional | dev featureは登録server identityをadapterで解決し、server lifetimeのDocument lifecycleを共有 |
| `server.ssrLoadModule()` | backward-compatible legacy API。Environment APIはrunnerをreplacementと説明 | 使用しない。`ViteDevModuleEvaluator`がModuleRunnerへ適合 |
| top-level `ssr` config | Environment API stable後にdeprecated予定 | 新adapterは `environments.render` を使用。public config compatibilityの入力だけ変換 |
| `server.moduleGraph`, `handleHotUpdate`, `server.ws` | client/ssr mixed backward-compatible view | 新規codeではavoid。per-environment graph / hot channelを使う |
| `experimental.bundledDev` | Vite 8.1でexperimental、8.2.1 typeではhighly experimental | user opt-in experimentのみ。Core依存禁止 |

公式資料:

- [Vite Environment API](https://vite.dev/guide/api-environment)
- [Environment API for Frameworks](https://vite.dev/guide/api-environment-frameworks)
- [Environment API for Plugins](https://vite.dev/guide/api-environment-plugins)
- [Environment API for Runtimes](https://vite.dev/guide/api-environment-runtimes)
- [Vite 8 announcement](https://vite.dev/blog/announcing-vite8)
- [Vite 8.1 announcement](https://vite.dev/blog/announcing-vite8-1)
- [React DOM static APIs](https://react.dev/reference/react-dom/static)
- [React `prerender`](https://react.dev/reference/react-dom/static/prerender)

## Build adapter

### Current adapter

通常の `minista build` はVite CLI processを二回spawnせず、同じNode.js processで `ViteAppBuilderAdapter` が一つのBuilderからrender/clientを順にbuildします。configがisSsrBuildを参照する場合やplugin構成がenvironment間で異なる場合は `LegacyViteBuilderAdapter`、任意のVite CLI flagをprogrammatic configへ変換できない場合は従来のCLIへ段階的にfallbackします。

EntryとIslandの通常buildはconfig-time temp importをbuild-session ArtifactStoreへ移行しました。`createViteAppConfig()` はrenderをserver consumerかつSSR build、clientをclient consumerかつnon-SSR buildとして構成します。`ViteEnvironmentInputAdapter` は `prepareClient` 時に解決済みRolldown optionを保ったままinputを差し替えます。このlate inputが実際のVite 8.2.1 client buildに反映されることはintegration testで確認済みです。

App Buildは全environment configを先に解決するため、render environment完了後に確定するclient input planを従来pluginの `config` hookでは渡せません。そのため `prepareViteClientEnvironment()` が `api.minista.prepareClient` をfeature descriptorのcapability / `after` でscheduleし、late preparationをconfig hookから分離します。SSG pluginは `config()` でrender/clientの静的設定を既存environment optionへ合成し、`prepareClient` でrender bundle評価、page render、Artifact生成を行います。Islandはsnippet Artifactをrenderで保存し、client preparationでsource planとentryを生成します。Entryもrendered page Artifactを解析してentryを生成し、両者は `ViteEnvironmentInputAdapter.merge()` でSSGのthrough inputを消さずnamed inputを合成します。render bundleでHead contextをrendererと共有するため、`minista/context` と `minista/head` はuserのRolldown external設定を保ったままexternalizeします。React関連importもrenderでexternalizeし、client限定のPreact aliasから分離します。Minista専用config markerかenvironment名も伝播するため、通常のVite `builder` optionをApp Buildと誤認しません。Comment、Svg、Sprite、Beautify、Archive、Bundleは `applyToEnvironment` でclientだけにoutput hookを登録し、ImageとSearchもenvironment別source transformを使うため、render側でclient用HTML変更やarchive生成を行いません。全compatibility plugin fixtureは単一Builder、isSsrBuildでaliasを分けるPreact fixtureはLegacy経路で検証しています。output claim collectorは対象environmentをproviderへ渡し、生成pluginは `ViteEnvironmentState` にclaimをidentity単位で分離して保持します。build sessionはbuildId、ArtifactStore、diagnostic collectorを共有し、CLIが全終了経路でArtifactStoreをclearします。App Builderはschema version、status、buildId、diagnostics、environment status、Core `OutputManifest` を一つのresultとして返します。manifestはlogical ID、kind、fileName、公開URL、byte size、entry/import関係だけを持ち、Vite Builder、実行code、asset source、絶対facade pathを含みません。

ADR-0013適用後は独立したBundle pluginを使用しません。SSGのrender outputからCSS／画像とmodule graphを収集し、route asset Artifactを生成してclientへ再emitします。MDX compilerは同じSSG adapterのtransform hookから対象moduleの初回読込時だけ初期化します。

programmatic Appはpre buildApp hookの前、Legacyはclient build直前に既存outDirを同じ親directoryのbuildId付きprivate backupへrenameします。emptyOutDir:falseとproject外outDirの既定保持ではcopy backします。build、post hook、claim検証、manifest／diagnosticsのatomic writeが成功した場合だけcommitし、捕捉可能な失敗時はpartial outDirを削除して旧outDirとmetadataを復元します。commit後のbackup削除失敗はwarningにします。これによりArchiveなどが通常のoutDirを参照する互換性を維持しながら、以前の正常な出力を保護します。outDirがproject rootや祖先、それらを指すsymlink経路または直接symlinkの場合はtransactionを開始せずstable errorにします。Vite config読込、Builder生成、render／client build、client preparationで発生した任意のprogrammatic errorはadapter境界で `MINISTA_VITE_BUILD_FAILED` に正規化し、environment、phase、project root内のsource locationをDiagnosticへ保存します。既にstableなMinista errorは再包装しません。CLIはsessionとerror由来のdiagnosticを重複排除し、失敗時もbuild ID付き `.minista/diagnostics.json` をatomic replaceします。未対応CLI flagで外部Vite CLIを起動する最終fallbackはtransactionの対象外ですが、processの起動失敗、signal終了、非zero終了を `MINISTA_VITE_CLI_FAILED` に正規化し、失敗したenvironmentとbuild IDを同じworkspace snapshotへ保存します。

### Environments

```ts
type MinistaEnvironmentName = "render" | "client"
```

- `render`: Node consumer。page/layout/getStaticDataとReact static rendererを実行するentryをbundle
- `client`: browser consumer。Island、bundle entry、CSS、generated assetをbundle

公開概念として `ssr` ではなく `render` を使用します。Ministaはrequest-time SSR serverを生成しないためです。Viteのbackward compatibility fieldを扱うadapter内部だけ `ssr` という語が残る場合があります。

### One application lifecycle

```text
minista build
  -> evaluate Minista/Vite config at the adapter boundary
  -> create ProjectContext + buildId
  -> createBuilder()
  -> begin output transaction
  -> builder.buildApp() (plugin pre/post hooks + owned callback)
  -> discover
  -> builder.build(render)
  -> evaluate render output
  -> resolve + render + analyze + generate
  -> persist explicit graph/artifact handoff
  -> builder.build(client)
  -> translate Vite output to OutputManifest
  -> compose + emit + finalize
  -> write manifest + diagnostics, commit output transaction
  -> one BuildResult
```

これは二つのenvironment bundleを物理的に一つへ結合する設計ではありません。目的は一process、一configuration boundary、一diagnostic collection、一cleanup policyを持つMinista build lifecycleにすることです。

render environmentのbuildはuser moduleをproduction相当のNode runtimeで評価するためのadapter準備で、Coreのdomain `bundle` phaseとは区別します。Coreの `resolve` はこのevaluatorが利用可能になった後に `getStaticData` を実行します。domain `bundle` phaseはgenerate済みclient entry / assetをclient environmentへ渡す段階です。

Viteはenvironment record順にbuildできますが、Ministaはrender結果からclient entry planを作るため、Minista所有のconfig.builder.buildAppが明示的に `builder.build(render)` と `builder.build(client)` を順に呼びます。pluginのbuildApp前後hookは実行しますが、callback置換やhookからの直接buildはMINISTA_VITE_APP_BUILD_RESERVEDで拒否します。parallel buildは採用しません。

### Inter-environment handoff

初期実装はViteのexperimental shared plugin stateに依存しません。

- orchestration state: Ministaの `ProjectContext`
- 大きい/generated data: `ArtifactStore` のbuildId namespace
- SSG render／compatibility phase trace: build session内のscope付きevent列
- compatibility documents／domain artifacts: build session内の共有Store
- compatibility graph／outputs: LifecycleRunnerがbuild sessionのmutable Graph／Emitterを直接共有
- client input: 解決時点でgraphを読むstable virtual entry
- bundle result: Vite/Rolldown objectからCore `OutputManifest` schema v1へ即座に変換済み

`.minista/work/<buildId>` を使う場合もproducer / schema / hashがあるdata artifactに限定し、native importするhandoff moduleや前回buildのglob searchは禁止します。render bundle自体はexecutable outputなのでnative importしますが、そのlocationはcurrent build resultから直接取得し、directory globで探索しません。

### User config compatibility

`isSsrBuild`を参照するconfig関数はgetterで検出し、MINISTA_VITE_APP_CONFIG_LEGACY_ENVIRONMENT warningとともに既存Legacy adapterへ送ります。同名pluginでもclosure内のoptionやaliasが異なる可能性があるため、plugin名の一致を互換性の証明には使いません。分割代入だけでも対象になります。

plugin名／順序も異なる場合は既存のMINISTA_VITE_APP_CONFIG_PLUGIN_MISMATCHを優先します。isSsrBuildを参照しないconfigのenvironment対応optionは引き続きrenderへ投影します。新しいconfigではenvironment-aware hookを使用します。config評価回数は一回と保証しません。詳細は[ADR-0015](decisions/0015-application-lifecycle-and-output-transaction.md)を参照してください。

## Dev adapter

通常のdev CLIは`ViteDevServerAdapter`を通じたprogrammatic `createServer({ appType: "custom" })`へ切り替え済みです。adapterはserver lifetimeのlifecycle session、listen、URL表示、CLI shortcut、closeを所有します。`ViteDevModuleEvaluator`はViteのdefault`ssr`environmentをguardし、`runner.import()`、module invalidation、stacktrace補正をCoreの`ModuleEvaluator`portへ適合させます。SSG、Island、Search、project commandはこの境界を使用します。Comment／Svg／Sprite／Image／Islandはdev sessionのDocument／Graph／Artifact／traceを共有します。SSGは同じ`src`と`layout`からdev用asset entryを構成し、adapterが解決したURLをHTMLへ注入します。compatibility fixtureではSSG HTML、Vite client injection、Search JSONと各dev lifecycle scopeを実際のViteによるHTTP応答で確認しています。

ModuleRunner評価、dev page snapshot cache、route単位のdiscovery／resolve cache、RouteNode／PageNode単位のrender invalidationとtargeted page reloadまで実装済みです。同時requestは同じloadへ合流し、page/layout依存のhot updateで世代を更新するため、古い非同期loadが完了しても次世代のcacheへ保存しません。`ViteDevUpdateAdapter` はenvironment別module graphの照会・invalidation、変更moduleのimporter chainからroute sourceへの投影、`environment.hot.send()` を所有し、SSG／Sprite pluginからmixed graphと直接WebSocket操作を除去しました。`LegacySsgRouteCache` は影響routeだけ `getStaticData()` とPageNode解決を再実行し、cache entryからProject Graph全体を再構成してglobal invariantを維持します。page固有の変更では影響RouteNode配下のrender cacheだけを破棄し、dev HTMLのHMR listenerへ該当URLだけを送ります。layoutまたは影響routeを限定できない変更では全page cacheと標準full reloadへfallbackします。SSGのpage／render／route cacheとrenderer、Sprite／Imageのgenerator、watch対象、Page indexはVite server identity単位に保持します。`ViteDevServerRegistry` はHTML contextのserverが未指定またはwrapper identityの場合とenvironment hook contextから、登録済みの所有serverを解決します。Spriteはsource directory、Imageはlocal sourceからpage URLへのArtifact edgeを保持し、source変更時に参照ページだけをreloadします。

### Dev adapter ownership

| 責務 | 所有者 | contract |
| --- | --- | --- |
| HTTP request／response、middleware error伝播 | Vite adapter | domain errorをViteのerror chainへ渡し、CoreはHTTP objectを受け取らない |
| module評価 | `ViteDevModuleEvaluator` | Coreの`ModuleEvaluator` portへ適合し、失敗をstructured diagnosticへ変換 |
| watch／HMR | `ViteDevUpdateAdapter` | environment graphから影響Pageを解決し、URL単位reloadまたはfull reloadを送信 |
| Vite alias／base／asset URL | plugin adapter | 確定URLだけをfeatureのoutput resolverへ渡す |
| HTML／Artifactのdomain処理 | Core feature | server lifetimeのDocument／Graph／Artifact／traceを共有してphaseを実行 |
| server単位cache／generator | adapter state | `ViteEnvironmentState`／`ViteDevServerRegistry`でidentityを明示し、module global stateを使わない |

この分離により、HTTP配信、watch、HMR、module評価、URL解決はVite adapterに残します。HTML文字列の解析・置換、参照収集、生成plan、検索data、renderはCore featureへ接続済みです。

```text
HTTP request
  -> Core route match
  -> render environment runner.import(page module / virtual render entry)
  -> resolve requested PageNode
  -> ReactStaticRenderer
  -> analyze + generate(dev)
  -> Vite HTML transform adapter
  -> response
```

- `createServer({ appType: "custom" })` でMinistaがmiddleware orderを所有する
- `server.environments.render` が `RunnableDevEnvironment` であることをguardする
- `runner.import()` を使用し、build用render bundleは作らない
- module exportsはin-process live valueとして取得する
- requestごとに全routeを再評価せず、discovery graphとmodule invalidationを分ける
- file changeはrender environmentのmodule graph → RouteNode/PageNode/Artifact edgeへ伝播する
- HTML documentが変わる場合はfull reload、独立client moduleは通常HMRを優先する
- errorはVite stacktraceをlocationに正規化し、Core Diagnosticに変換する

## Bundled Dev policy

### 現時点で採用する部分

- adapter interfaceにbundled/unbundledを露出しない
- userの明示opt-in configを壊さずclient environmentへ渡す
- Vite pluginが `isBundled` に依存せずlogical virtual entryを解決できるようにする

### Experimentalとして試す部分

- client environmentのみ `experimental.bundledDev: true`
- Island client entry、CSS injection、virtual module、HMR、third-party React pluginのintegration matrix
- 大規模fixtureでcold start / full reload / HMR latencyを測る

### 安定化待ち

- v5 defaultのBundled Dev化
- render environmentのbundled dev
- Bundled Dev固有APIを利用したCore cache / graph semantics
- third-party plugin compatibilityを前提とする最適化

Vite 8.1の公式告知ではbrowser sideとbasic plugin / main featureが中心で、third-party pluginとminor featureは未対応の可能性が明記されています。このため、ministaの多段HTML / virtual entry featureのdefaultにする根拠はまだありません。

## React static rendering boundary

現在はStaticRenderer portを通じてReact 19のprerenderToNodeStream()を使用し、Preact／React 18ではrenderToString() adapterへfallbackします。Headを含むpage treeを一回だけrenderします。

React 19.2の公式資料ではstatic APIはSSG用で、`prerender()` はSuspense dataの完了を待ちます。一方Node.jsではWeb Stream版より `prerenderToNodeStream()` が推奨されています。この境界を次のportで実装しています。

```ts
interface StaticRenderer {
  render(input: RenderInput, context: RenderContext): Promise<RenderResult>
}
```

- Node default: `react-dom/static` の `prerenderToNodeStream()`
- Web/edge adapter candidate: `prerender()`
- compatibility fallback: current `renderToString()` adapter
- partial prerender / resume API: experimentalのため初期不採用

Headはrender中のside effectで収集されるため、page treeを二重renderしません。`Head` semantics、Suspense、preload、doctypeはfixtureで固定し、Preact aliasを検出した場合とReact 18でstatic APIを読み込めない場合はcurrent adapterへfallbackします。

## Rolldown boundary

- Vite 8のproduction outputはRolldownだが、featureはRolldown `OutputBundle` を直接変更しない
- Islandのsource transformはVite plugin contextのstableな`this.parse()`をadapterへ注入し、`lang: "tsx"`のESTree互換ASTを読み取り専用で使用する。変更はMagicStringによるsource range編集に限定する
- adapterがchunk/asset metadataをnormalized `OutputManifest` に変換する。schema v1は実装済み
- asset entryはlogical ArtifactIdで宣言し、file name matchingや `originalFileNames` scanはadapter内に限定
- `generateBundle`／`writeBundle`のdomain operationをadapterで集約し、全descriptorの依存順にdispatchする。feature内のscope付きphase bridgeは維持する
- userの `build.rolldownOptions` は可能な限り透過的に維持し、Minista reserved input/outputとの衝突をdiagnosticにする

## Version and fallback policy

- Vite peer rangeはstable major全体を許容し、既存projectのpackage manager warningで導入を妨げない
- repositoryの開発環境とcreate-ministaのtemplateは検証済みの最新minorに揃える
- peer rangeの最低versionはAPI contractを基準にやや楽観的に設定し、互換性問題の報告または再現を確認した場合に引き上げる
- Vite peer rangeの引上げはcompatibility suiteと同時に行う
- Environment/App Build adapterは最低・推奨・latest minorでintegration test
- experimental APIのshape changeはadapterのminor releaseで吸収
- fallbackは「旧二回CLI build」全体ではなく、可能な限り `LegacyViteBuilderAdapter` として隔離
- upstream APIがstableになった時点でstatusと再検討日をこの文書に更新する

### Retained compatibility fallbacks

Stage 8完了時点でfallbackは次の2経路だけです。

| 経路 | 発動条件 | 削除条件 |
| --- | --- | --- |
| `LegacyViteBuilderAdapter` | configがisSsrBuildを参照する、またはrender／clientでplugin名・順序が異なる | environment-aware configへの移行期間を1 minor設け、警告利用状況を確認後に削除 |
| 外部Vite CLI | programmatic configへ安全に変換できないCLI flagを指定 | 対応flagを明示的に変換するか、unsupported optionのstable diagnosticへ移行したmajorで削除 |

通常のbuild／dev、公開plugin、Core lifecycleはfallback実装へ依存しません。`createBuilder()`とApp Build関連APIがexperimentalである間は安全網として保持し、fallbackの追加は禁止します。再検討日はVite Environment APIまたは`createBuilder()`のstable化を確認した最初のMinista minor releaseです。
