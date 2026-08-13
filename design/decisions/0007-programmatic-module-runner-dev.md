# ADR-0007: programmatic custom serverからModuleRunner devへ移行する

- Status: Accepted with incremental migration
- Date: 2026-08-13

## Context

従来のdev CLIは外部 `vite` processを起動し、`pluginSsg()` のmiddlewareが `server.ssrLoadModule()` でpage/layout glob全体をrequestごとに評価します。server lifecycle、middleware order、module invalidation、diagnostic collectionがMinistaのapplication lifecycle外にあります。

Vite 8.2.1はcustom app server、environmentごとのmodule graph、`RunnableDevEnvironment.runner.import()` を提供します。一方、既存pluginは `ssr` environment名、`server.moduleGraph`、`server.ws` に依存しているため、一括置換はdev互換性を損ないます。

## Decision

devを次の順に段階移行します。

1. `ViteDevServerAdapter` が `createServer({ appType: "custom" })`、listen、URL表示、shortcut、closeを所有する
2. 一般的なVite dev flagはprogrammatic configへ変換し、未対応flagだけ外部Vite CLIへfallbackする
3. render module評価をadapterへ閉じ、`RunnableDevEnvironment.runner.import()` へ置き換える
4. route discovery cacheとenvironment module graphのinvalidationを対応付ける
5. pluginからlegacy `ssrLoadModule()`、mixed module graph、直接WebSocket reloadを除去する

CoreはVite server、ModuleRunner、module graphの型を持ちません。module評価は既存の `ModuleEvaluator` portを通します。

## Consequences

- Ministaがdev middleware orderとserver shutdownを管理できる
- build用render bundleなしでproductionと同じroute/page graphへ近づけられる
- 移行中はprogrammatic serverとlegacy SSG middlewareが一時的に共存する
- 未対応CLI flagでは従来の外部Vite processが残る

## Rejected alternatives

### 外部Vite CLIを維持したままpluginだけModuleRunner化する

server lifecycleとdiagnostic boundaryを所有できず、custom middleware orderとcleanup policyを確立できません。

### 全pluginを一度にnamed render environmentへ変更する

HMR、Island、Search、Spriteの互換差分を分離できないため採用しません。

## Reconsider when

- Viteがcustom serverまたはRunnableDevEnvironmentを置換した場合
- Environment APIがstable化し、より小さいadapterで同じlifecycleを構成できる場合
