# ADR-0007: programmatic custom serverからModuleRunner devへ移行する

- Status: Accepted
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

手順1〜5は実装済みです。`ViteDevServerAdapter` はcreate、listen、起動後設定、closeの失敗をoperation付き `MINISTA_VITE_DEV_SERVER_FAILED` diagnosticへ正規化し、listen後の設定失敗でもserverを閉じます。`ViteDevModuleEvaluator` はViteのdefault `ssr` environmentをguardし、SSG、Island、Search、project commandのmodule評価を共有します。ModuleRunnerのimport失敗はstacktrace補正後に `MINISTA_VITE_DEV_MODULE_FAILED` へ正規化し、environmentとmodule ID、project root内に限ったsource locationを保持します。`LegacySsgRouteCache` は変更moduleから特定したrouteだけdiscovery、`getStaticData()`、PageNode解決を再実行し、Project Graph全体をcache entryから再構成します。Sprite／Imageはlocal sourceから参照ページへのArtifact edgeも保持します。generator、watch対象、Page indexはVite server identity単位に分離し、optionalなHTML context serverと登録済みserverの対応は `ViteDevServerRegistry` が単一serverまたはfilename rootから明示的に解決します。`ViteDevUpdateAdapter` はenvironment別module graphとhot channelを所有し、pluginからmixed graph／直接WebSocket操作を除去しました。page固有変更とSprite／Image変更はcustom HMR eventで該当URLだけをreloadし、全体変更だけ標準full reloadへfallbackします。

## Consequences

- Ministaがdev middleware orderとserver shutdownを管理できる
- build用render bundleなしでproductionと同じroute/page graphへ近づけられる
- SSGのHTTP middlewareは公開Vite facadeとして残るが、module評価、route解決、renderは共有Core／adapterへ一本化される
- 未対応CLI flagでは従来の外部Vite processが残る

## Rejected alternatives

### 外部Vite CLIを維持したままpluginだけModuleRunner化する

server lifecycleとdiagnostic boundaryを所有できず、custom middleware orderとcleanup policyを確立できません。

### 全pluginを一度にnamed render environmentへ変更する

HMR、Island、Search、Spriteの互換差分を分離できないため採用しません。

## Reconsider when

- Viteがcustom serverまたはRunnableDevEnvironmentを置換した場合
- Environment APIがstable化し、より小さいadapterで同じlifecycleを構成できる場合
