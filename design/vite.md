# Vite boundary

最終確認日: 2026-08-13

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

## 2026-08-12時点のAPI status

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
| `server.ssrLoadModule()` | backward-compatible legacy API。Environment APIはrunnerをreplacementと説明 | 新規codeではavoid。migration fallbackのみ |
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

## Target build

### 移行中のcurrent adapter

Stage 5の最初の変更として、通常の `minista build` はVite CLI processを二回spawnせず、同じNode.js processからBuilder APIをrender/clientの順に呼ぶ `LegacyViteBuilderAdapter` へ移行しました。このadapterは各buildで `createBuilder(config, true)` が作るbackward-compatible environmentを明示的にbuildします。任意のVite CLI flagを完全にはprogrammatic configへ変換できないため、未対応flagを指定した場合だけ従来のCLI fallbackを使用します。

これは最終構造ではありません。EntryとIslandの通常buildはconfig-time temp importをbuild-session ArtifactStoreへ移行しました。また、一つの `createBuilder(config, false)` が持つrender/client environmentを `render → prepareClient → client` の順でbuildする `ViteAppBuilderAdapter` を追加しました。`createViteAppConfig()` はrenderをserver consumerかつSSR build、clientをclient consumerかつnon-SSR buildとして構成します。`ViteEnvironmentInputAdapter` は `prepareClient` 時に解決済みRolldown optionを保ったままinputを差し替えます。このlate inputが実際のVite 8.2.1 client buildに反映されることはintegration testで確認済みです。

一方、App Buildは全environment configを先に解決するため、render environment完了後に確定するclient input planを従来pluginの `config` hookでは渡せません。そのため `prepareViteClientEnvironment()` が `api.minista.prepareClient` をfeature descriptorのcapability / `after` でscheduleし、late preparationをconfig hookから分離します。SSG pluginは `configEnvironment()` でrender/clientの静的設定を返し、`prepareClient` でrender bundle評価、page render、Artifact生成、client input適用を行う形へ移行済みです。Minista専用config markerかenvironment名も伝播するため、通常のVite `builder` optionをApp Buildと誤認しません。EntryとIslandなど残るclient pluginを同じ境界へ移してから、以下の単一 `createBuilder()` lifecycleへdefaultを切り替えます。

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
- client input: 解決時点でgraphを読むstable virtual entry
- bundle result: Vite/Rolldown objectからCore `OutputManifest` へ即座に変換

`.minista/work/<buildId>` を使う場合もproducer / schema / hashがあるdata artifactに限定し、native importするhandoff moduleや前回buildのglob searchは禁止します。render bundle自体はexecutable outputなのでnative importしますが、そのlocationはcurrent build resultから直接取得し、directory globで探索しません。

### User config compatibility

`defineConfig(({ command, isSsrBuild }) => ...)` を利用する既存projectが存在します。v5は一移行期間、render environment解決時にcompatibility config envを提供します。ただし新documentationはenvironment-aware helperを案内し、`isSsrBuild` 分岐を推奨しません。

注意点として、現在 `isBuild` 時だけPreact aliasを設定する例があります。renderとclientでalias意図が異なるため、fixtureでcurrent behaviorを固定し、必要なら `minista.environment === "client"` のtyped helperを追加します。

## Target dev

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
- adapterがchunk/asset metadataをnormalized `OutputManifest` に変換する
- asset entryはlogical ArtifactIdで宣言し、file name matchingや `originalFileNames` scanはadapter内に限定
- `generateBundle` で複数featureがHTMLを順番に変更するcurrent patternを廃止
- userの `build.rolldownOptions` は可能な限り透過的に維持し、Minista reserved input/outputとの衝突をdiagnosticにする

## Version and fallback policy

- Vite peer rangeの引上げはcompatibility suiteと同時に行う
- Environment/App Build adapterは最低・推奨・latest minorでintegration test
- experimental APIのshape changeはadapterのminor releaseで吸収
- fallbackは「旧二回CLI build」全体ではなく、可能な限り `LegacyViteBuilderAdapter` として隔離
- upstream APIがstableになった時点でstatusと再検討日をこの文書に更新する
