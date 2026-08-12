# ADR-0003: Vite App Buildによる単一lifecycle

- Status: Accepted with compatibility fallback
- Date: 2026-08-12

## Context

現行CLIは `vite build --ssr` と `vite build` を別processで連続実行します。失敗、diagnostic、cache、cleanupが二分され、featureはfilesystemのtemp moduleで状態を渡します。

Vite 8.2.1はEnvironment API、App Build、`createBuilder()`、`buildApp()` を提供します。ただしEnvironment API全体はRCで、`createBuilder` と `buildApp` hook、shared build optionは型上experimentalです。

## Decision

v5 build adapterは `render` と `client` environmentを一つのMinista application lifecycleで順にbuildします。CLIはprogrammatic `createBuilder()` を使い、一つのBuildResultとdiagnostic collectionを返します。

- renderとclient bundleの物理分離は維持する
- inter-environment dataはProjectContext / versioned ArtifactStoreで渡す
- experimental shared plugin / shared config stateには依存しない
- adapterのVite minor matrixと、移行期間中のisolated legacy adapterを持つ
- Core phaseは `buildApp` hookの存在や順序を知らない

移行中は `LegacyViteBuilderAdapter` が同一Node.js processで `createBuilder(config, true)` をrender/clientごとに作り、それぞれのbackward-compatible environmentを順にbuildします。未対応CLI flagのみ二process fallbackを使用します。App Buildの事前検証により、現行client pluginのconfig-time temp importは全environment configの先行解決と両立しないことが確認されました。単一Builder内で `render → prepareClient → client` を実行する `ViteAppBuilderAdapter`、名前付きenvironmentを構成する `createViteAppConfig()`、late named input合成をVite境界に閉じ込める `ViteEnvironmentInputAdapter` は実装済みです。`api.minista.prepareClient` はfeature descriptorのcapabilityと順序制約でscheduleし、SSGはrender bundle評価とrendered page Artifact生成、Entryはasset entry生成、Islandはsnippet Artifactからのsource planとentry生成をこのlate phaseで行います。不正な依存はstructured diagnosticにします。Head contextはrender bundleでexternalizeし、rendererと同一instanceを使用します。client-only output hookは `applyToEnvironment` でrenderから除外します。この反映はVite 8.2.1との全compatibility plugin integration testで固定します。Image / Searchのenvironment別transformとresult / cleanup lifecycleを接続した後にこのadapterをdefaultにします。

## Consequences

- Vite CLIの二回spawnとexecutable temp handoffを削除できる
- render結果に基づきclient entryを決める順序を一箇所で管理できる
- Vite experimental API changeへの追従がadapterに必要
- user configの `isSsrBuild` 分岐にcompatibility translationが必要

## Rejected alternatives

### render/clientを一つのbundleに統合する

runtime targetとoutputの目的が異なり、不要な複雑性を生みます。単一lifecycleは単一bundleを意味しません。

### 現行二processを維持してmanifestだけ改善する

data contractは改善できますが、一configuration / diagnostic / cleanup lifecycleという目的を満たしません。

### shared plugin stateのみでenvironment間を連携する

Viteのshared optionはexperimentalで、Coreの再利用性とprocess isolationを損ないます。optimizationとして将来検討する余地だけ残します。

## Reconsider when

- ViteがApp Build APIを置換または削除した場合
- Viteのstable orchestration APIが同じ要件をより少ないadapter codeで満たす場合
- render bundleを作らず安全にproduction module evaluationできるstable APIが提供された場合
