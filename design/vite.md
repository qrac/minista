# Vite boundary

最終確認日: 2026-08-12

確認対象: repository lockfile の Vite 8.2.1、および Vite / React 公式資料

## Boundary rule

Vite は Minista Core ではなく adapter です。

Core が要求する port:

- `ModuleEvaluator`: user page/layout/static data module を評価する
- `Bundler`: client / render entry と asset plan を bundle する
- `DevModuleGraph`: file change と graph node の invalidation を結び付ける
- `OutputManifest`: logical artifact ID と hashed output URL を対応付ける
- `HtmlDevTransform`: Vite / third-party plugin の HTML transform が必要な場合に適用する

Vite adapter だけが `vite` の `Environment`, `ViteBuilder`, `RunnableDevEnvironment`, plugin hook、Rolldown output type を参照します。Core の public schema に Vite module ID、Rollup/Rolldown chunk object、`ResolvedConfig` を保存しません。

## 2026-08-12 時点の API status

| API / 機能 | 公式 status | v5 の扱い |
| --- | --- | --- |
| Vite 8 / Rolldown | stable major。Vite 8 は production bundler を Rolldown に統一 | production adapter の前提。Rollup 固有名称を新 Core API に使わない |
| Environment API | Release Candidate。major 間の安定を目指すが一部 API は experimental | render/client model に採用。adapter に隔離し version matrix を持つ |
| `RunnableDevEnvironment.runner.import()` / ModuleRunner | Environment API の modern SSR evaluation path。server module runner factory 自体には experimental 表記あり | default dev evaluation 候補。`isRunnableDevEnvironment` guard を必須にする |
| App Build (`builder: {}`, `vite build --app`) | Environment API framework API。将来 default 予定 | Minista CLI は programmatic path を所有する |
| `createBuilder()` | Vite 8.2.1 type declaration で `@experimental` | v5 adapter で採用するが minor version test と fallback を持つ |
| `buildApp` hook | Vite 8.2.1 type declaration で `@experimental` | orchestration 補助。Core lifecycle 自体を hook semantics に依存させない |
| `builder.sharedConfigBuild`, `sharedPlugins` | experimental | 初期不採用 |
| `this.environment`, environment module graph, `hotUpdate` | Environment API migration path | adapter 内で採用。state は environment 単位に分離 |
| `server.ssrLoadModule()` | backward-compatible legacy API。Environment API は runner を replacement と説明 | 新規 code では avoid。migration fallback のみ |
| top-level `ssr` config | Environment API stable 後に deprecated 予定 | 新 adapter は `environments.render` を使用。public config compatibility の入力だけ変換 |
| `server.moduleGraph`, `handleHotUpdate`, `server.ws` | client/ssr mixed backward-compatible view | 新規 code では avoid。per-environment graph / hot channel を使う |
| `experimental.bundledDev` | Vite 8.1 で experimental、8.2.1 type では highly experimental | user opt-in experiment のみ。Core 依存禁止 |

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

### Environments

```ts
type MinistaEnvironmentName = "render" | "client"
```

- `render`: Node consumer。page/layout/getStaticData と React static renderer を実行する entry を bundle
- `client`: browser consumer。Island、bundle entry、CSS、generated asset を bundle

公開概念として `ssr` ではなく `render` を使用します。Minista は request-time SSR server を生成しないためです。Vite の backward compatibility field を扱う adapter 内部だけ `ssr` という語が残る場合があります。

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

これは二つの environment bundle を物理的に一つへ結合する設計ではありません。目的は一 process、一 configuration boundary、一 diagnostic collection、一 cleanup policy を持つ Minista build lifecycle にすることです。

render environment の build は user module を production 相当の Node runtime で評価するための adapter 準備で、Core の domain `bundle` phase とは区別します。Core の `resolve` はこの evaluator が利用可能になった後に `getStaticData` を実行します。domain `bundle` phase は generate 済み client entry / asset を client environment へ渡す段階です。

Vite は environment record 順に build できますが、Minista は render 結果から client entry plan を作るため、adapter が明示的に `builder.build(render)` と `builder.build(client)` を順に呼びます。parallel build は採用しません。

### Inter-environment handoff

初期実装は Vite の experimental shared plugin state に依存しません。

- orchestration state: Minista の `ProjectContext`
- 大きい/generated data: `ArtifactStore` の buildId namespace
- client input: 解決時点で graph を読む stable virtual entry
- bundle result: Vite/Rolldown object から Core `OutputManifest` へ即座に変換

`.minista/work/<buildId>` を使う場合も producer / schema / hash がある data artifact に限定し、native import する handoff module や前回 build の glob search は禁止します。render bundle 自体は executable output なので native import しますが、その location は current build result から直接取得し、directory glob で探索しません。

### User config compatibility

`defineConfig(({ command, isSsrBuild }) => ...)` を利用する既存 project が存在します。v5 は一移行期間、render environment 解決時に compatibility config env を提供します。ただし新 documentation は environment-aware helper を案内し、`isSsrBuild` 分岐を推奨しません。

注意点として、現在 `isBuild` 時だけ Preact alias を設定する例があります。render と client で alias 意図が異なるため、fixture で current behavior を固定し、必要なら `minista.environment === "client"` の typed helper を追加します。

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

- `createServer({ appType: "custom" })` で Minista が middleware order を所有する
- `server.environments.render` が `RunnableDevEnvironment` であることを guard する
- `runner.import()` を使用し、build 用 render bundle は作らない
- module exports は in-process live value として取得する
- request ごとに全 route を再評価せず、discovery graph と module invalidation を分ける
- file change は render environment の module graph → RouteNode/PageNode/Artifact edge へ伝播する
- HTML document が変わる場合は full reload、独立 client module は通常 HMR を優先する
- error は Vite stacktrace を location に正規化し、Core Diagnostic に変換する

## Bundled Dev policy

### 現時点で採用する部分

- adapter interface に bundled/unbundled を露出しない
- user の明示 opt-in config を壊さず client environment へ渡す
- Vite plugin が `isBundled` に依存せず logical virtual entry を解決できるようにする

### Experimental として試す部分

- client environment のみ `experimental.bundledDev: true`
- Island client entry、CSS injection、virtual module、HMR、third-party React plugin の integration matrix
- 大規模 fixture で cold start / full reload / HMR latency を測る

### 安定化待ち

- v5 default の Bundled Dev 化
- render environment の bundled dev
- Bundled Dev 固有 API を利用した Core cache / graph semantics
- third-party plugin compatibility を前提とする最適化

Vite 8.1 の公式告知では browser side と basic plugin / main feature が中心で、third-party plugin と minor feature は未対応の可能性が明記されています。このため、minista の多段 HTML / virtual entry feature の default にする根拠はまだありません。

## React static rendering boundary

現在は `react-dom/server` の同期 `renderToString()` で body markup を作り、mutable `HeadContext` から収集した head を外側で連結しています。

React 19.2 の公式資料では static API は SSG 用で、`prerender()` は Suspense data の完了を待ちます。一方 Node.js では Web Stream 版より `prerenderToNodeStream()` が推奨されています。したがって target は次です。

```ts
interface StaticRenderer {
  render(input: RenderInput, context: RenderContext): Promise<RenderResult>
}
```

- Node default candidate: `react-dom/static` の `prerenderToNodeStream()`
- Web/edge adapter candidate: `prerender()`
- compatibility fallback: current `renderToString()` adapter
- partial prerender / resume API: experimental のため初期不採用

Head は render 中の side effect で収集されるため、full document 一回 render への単純置換はできません。`Head` semantics、Suspense、preload、doctype を integration test で固定し、二重 render を導入せずに document composition できる adapter が確認されるまで current adapter を fallback とします。

## Rolldown boundary

- Vite 8 の production output は Rolldown だが、feature は Rolldown `OutputBundle` を直接変更しない
- adapter が chunk/asset metadata を normalized `OutputManifest` に変換する
- asset entry は logical ArtifactId で宣言し、file name matching や `originalFileNames` scan は adapter 内に限定
- `generateBundle` で複数 feature が HTML を順番に変更する current pattern を廃止
- user の `build.rolldownOptions` は可能な限り透過的に維持し、Minista reserved input/output との衝突を diagnostic にする

## Version and fallback policy

- Vite peer range の引上げは compatibility suite と同時に行う
- Environment/App Build adapter は最低・推奨・latest minor で integration test
- experimental API の shape change は adapter の minor release で吸収
- fallback は「旧二回 CLI build」全体ではなく、可能な限り `LegacyViteBuildAdapter` として隔離
- upstream API が stable になった時点で status と再検討日をこの文書に更新する
