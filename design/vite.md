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

通常の `minista build` はVite CLI processを二回spawnせず、同じNode.js processで `ViteAppBuilderAdapter` が一つのBuilderからrender/clientを順にbuildします。config plugin構成がenvironment間で異なる場合は `LegacyViteBuilderAdapter`、任意のVite CLI flagをprogrammatic configへ変換できない場合は従来のCLIへ段階的にfallbackします。

EntryとIslandの通常buildはconfig-time temp importをbuild-session ArtifactStoreへ移行しました。`createViteAppConfig()` はrenderをserver consumerかつSSR build、clientをclient consumerかつnon-SSR buildとして構成します。`ViteEnvironmentInputAdapter` は `prepareClient` 時に解決済みRolldown optionを保ったままinputを差し替えます。このlate inputが実際のVite 8.2.1 client buildに反映されることはintegration testで確認済みです。

App Buildは全environment configを先に解決するため、render environment完了後に確定するclient input planを従来pluginの `config` hookでは渡せません。そのため `prepareViteClientEnvironment()` が `api.minista.prepareClient` をfeature descriptorのcapability / `after` でscheduleし、late preparationをconfig hookから分離します。SSG pluginは `config()` でrender/clientの静的設定を既存environment optionへ合成し、`prepareClient` でrender bundle評価、page render、Artifact生成を行います。Islandはsnippet Artifactをrenderで保存し、client preparationでsource planとentryを生成します。Entryもrendered page Artifactを解析してentryを生成し、両者は `ViteEnvironmentInputAdapter.merge()` でSSGのthrough inputを消さずnamed inputを合成します。render bundleでHead contextをrendererと共有するため、`minista/context` と `minista/head` はuserのRolldown external設定を保ったままexternalizeします。React関連importもrenderでexternalizeし、client限定のPreact aliasから分離します。Minista専用config markerかenvironment名も伝播するため、通常のVite `builder` optionをApp Buildと誤認しません。Comment、Svg、Sprite、Beautify、Archive、Bundleは `applyToEnvironment` でclientだけにoutput hookを登録し、ImageとSearchもenvironment別source transformを使うため、render側でclient用HTML変更やarchive生成を行いません。全compatibility plugin fixtureとPreact fixtureの単一Builder buildは成功済みです。output claim collectorは対象environmentをproviderへ渡し、生成pluginは `ViteEnvironmentState` にclaimをidentity単位で分離して保持します。build sessionはbuildId、ArtifactStore、diagnostic collectorを共有し、CLIが全終了経路でArtifactStoreをclearします。App Builderはschema version、status、buildId、diagnostics、environment status、Core `OutputManifest` を一つのresultとして返します。manifestはlogical ID、kind、fileName、公開URL、byte size、entry/import関係だけを持ち、Vite Builder、実行code、asset source、絶対facade pathを含みません。

programmatic App／legacy client buildはclient build直前に既存outDirを同じ親directoryのbuildId付きprivate backupへrenameします。buildとmanifest生成が成功した場合だけbackupを削除し、失敗時はpartial outDirを削除してbackupを元の名前へ戻します。これによりArchiveなどが通常のoutDirを参照する互換性を維持しながら、以前の正常な出力を保護します。outDirがproject rootまたはfilesystem rootの場合はtransactionを開始せずstable errorにします。Vite config読込、Builder生成、render／client build、client preparationで発生した任意のprogrammatic errorはadapter境界で `MINISTA_VITE_BUILD_FAILED` に正規化し、environment、phase、project root内のsource locationをDiagnosticへ保存します。既にstableなMinista errorは再包装しません。CLIはsessionとerror由来のdiagnosticを重複排除し、失敗時もbuild ID付き `.minista/diagnostics.json` をatomic replaceします。未対応CLI flagで外部Vite CLIを起動する最終fallbackはtransactionの対象外ですが、processの起動失敗、signal終了、非zero終了を `MINISTA_VITE_CLI_FAILED` に正規化し、失敗したenvironmentとbuild IDを同じworkspace snapshotへ保存します。

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
  -> load Minista/Vite config once
  -> create ProjectContext + buildId
  -> createBuilder()
  -> discover
  -> builder.build(render)
  -> evaluate render output
  -> resolve + render + analyze + generate
  -> persist explicit graph/artifact handoff
  -> builder.build(client)
  -> translate Vite output to OutputManifest
  -> compose + emit + finalize
  -> one BuildResult
```

これは二つのenvironment bundleを物理的に一つへ結合する設計ではありません。目的は一process、一configuration boundary、一diagnostic collection、一cleanup policyを持つMinista build lifecycleにすることです。

render environmentのbuildはuser moduleをproduction相当のNode runtimeで評価するためのadapter準備で、Coreのdomain `bundle` phaseとは区別します。Coreの `resolve` はこのevaluatorが利用可能になった後に `getStaticData` を実行します。domain `bundle` phaseはgenerate済みclient entry / assetをclient environmentへ渡す段階です。

Viteはenvironment record順にbuildできますが、Ministaはrender結果からclient entry planを作るため、adapterが明示的に `builder.build(render)` と `builder.build(client)` を順に呼びます。parallel buildは採用しません。

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

`defineConfig(({ command, isSsrBuild }) => ...)` を利用する既存projectが存在します。App Build adapterはconfig関数をlegacy render envでも評価し、`build`、`define`、environment対応の `resolve` optionなどをrender environmentへ投影します。`resolve.alias` はViteのenvironment optionではないため投影せず、Preact互換ではrender bundleのReact関連importをexternalizeしてclient aliasの影響を遮断します。この挙動はPreactとIslandを含むApp Build fixtureで固定しています。

`isSsrBuild` でplugin配列そのものを変えるconfigは、Viteがroot pluginを全environmentへ先に解決する制約があるため、plugin名と順序の差分をbuild開始前に検出します。`MINISTA_VITE_APP_CONFIG_PLUGIN_MISMATCH` warningを出し、同一processのlegacy adapterへfallbackします。新documentationはenvironment-aware helperを案内し、`isSsrBuild` 分岐を推奨しません。

## Dev adapter

通常のdev CLIは `ViteDevServerAdapter` を通じたprogrammatic `createServer({ appType: "custom" })` へ切り替え済みです。adapterはserver lifetimeのlifecycle session、listen、URL表示、CLI shortcut、closeを所有し、一般的なdev flagをInlineConfigへ変換します。sessionはcreate／listen／configure失敗と通常closeの全経路で破棄します。create、listen、起動後設定、closeの任意errorはoperationを持つ `MINISTA_VITE_DEV_SERVER_FAILED` へ正規化し、CLIは同じstructured diagnostic formatterで表示します。`ViteDevModuleEvaluator` はViteのdefault `ssr` environmentを `isRunnableDevEnvironment()` でguardし、`runner.import()`、module invalidation、stacktrace補正をCoreの `ModuleEvaluator` portへ適合させます。ModuleRunner import失敗はstacktrace補正後に `MINISTA_VITE_DEV_MODULE_FAILED` へ正規化し、environment、module ID、project root内だけのsource locationを返します。build adapterと共有するlocation変換はvirtual module、query、project外pathを公開Diagnosticから除外します。SSG、Island、Search、project commandはこの境界を使用し、plugin／CLIからのlegacy `ssrLoadModule()` 直接利用は除去済みです。Comment／Svg／Sprite／Image／Island／Bundleはdev sessionのDocument／Graph／Artifact／traceを共有します。Sprite、Image、Islandのpage scope付き参照Artifactは別ページのrequest間でも保持し、入力ページ限定のphaseから集約出力を再生成します。Bundle bootstrapはadapterで解決したalias URLをCore composeへ渡します。SSG devも同じsessionのArtifact／diagnostics／traceを使うCore render phaseへ接続済みです。Search JSON endpointもRenderedPage群を同じsessionへ投影してCore analyze／generateを実行し、失敗をVite middleware error chainへ渡します。compatibility fixtureではSSG HTML、Vite client injection、Search JSONと各dev lifecycle scopeを実際のVite 8.2.1によるHTTP応答で確認しています。

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

現在は `react-dom/server` の同期 `renderToString()` でbody markupを作り、mutable `HeadContext` から収集したheadを外側で連結しています。

React 19.2の公式資料ではstatic APIはSSG用で、`prerender()` はSuspense dataの完了を待ちます。一方Node.jsではWeb Stream版より `prerenderToNodeStream()` が推奨されています。したがってtargetは次です。

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
- adapterがchunk/asset metadataをnormalized `OutputManifest` に変換する。schema v1は実装済み
- asset entryはlogical ArtifactIdで宣言し、file name matchingや `originalFileNames` scanはadapter内に限定
- `generateBundle` で複数featureがHTMLを順番に変更するcurrent patternを廃止
- userの `build.rolldownOptions` は可能な限り透過的に維持し、Minista reserved input/outputとの衝突をdiagnosticにする

## Version and fallback policy

- Vite peer rangeの引上げはcompatibility suiteと同時に行う
- Environment/App Build adapterは最低・推奨・latest minorでintegration test
- experimental APIのshape changeはadapterのminor releaseで吸収
- fallbackは「旧二回CLI build」全体ではなく、可能な限り `LegacyViteBuilderAdapter` として隔離
- upstream APIがstableになった時点でstatusと再検討日をこの文書に更新する

### Retained compatibility fallbacks

Stage 8完了時点でfallbackは次の2経路だけです。

| 経路 | 発動条件 | 削除条件 |
| --- | --- | --- |
| `LegacyViteBuilderAdapter` | legacy render／client config評価でplugin名または順序が異なる | environment-aware configへの移行期間を1 minor設け、警告利用状況を確認後に削除 |
| 外部Vite CLI | programmatic configへ安全に変換できないCLI flagを指定 | 対応flagを明示的に変換するか、unsupported optionのstable diagnosticへ移行したmajorで削除 |

通常のbuild／dev、公開plugin、Core lifecycleはfallback実装へ依存しません。`createBuilder()`とApp Build関連APIがexperimentalである間は安全網として保持し、fallbackの追加は禁止します。再検討日はVite Environment APIまたは`createBuilder()`のstable化を確認した最初のMinista minor releaseです。
