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

通常buildは単一Builder内で `render → prepareClient → client` を実行する `ViteAppBuilderAdapter` を既定経路とします。名前付きenvironmentを構成する `createViteAppConfig()`、late named input合成をVite境界に閉じ込める `ViteEnvironmentInputAdapter`、feature descriptorのcapabilityと順序制約で `api.minista.prepareClient` をscheduleする処理を実装済みです。SSGはrender bundle評価とrendered page Artifact生成、Entryはasset entry生成、Islandはsnippet Artifactからのsource planとentry生成をlate phaseで行います。不正な依存はstructured diagnosticにします。Head contextはrender bundleでexternalizeし、rendererと同一instanceを使用します。client-only output hookは `applyToEnvironment` でrenderから除外し、Image / Searchのtransformもenvironment別に分離します。legacy render envでconfigを再評価してenvironment対応optionを投影し、client限定のPreact aliasはrenderのReact関連importをexternalizeして分離します。plugin構成差分はstable diagnosticを出し、同一processの `LegacyViteBuilderAdapter` へfallbackします。未対応CLI flagのみ二process fallbackを使用します。build sessionはbuildId、ArtifactStore、diagnostic collectorを共有し、CLIが全終了経路でArtifactStoreをclearします。App Builderはclient outputをCore `OutputManifest` schema v1へ即時変換し、raw Vite output、Builder、実行code、source本文、絶対pathを公開resultへ含めません。programmatic App／legacy client buildは既存outDirをprivate backupへrenameし、成功時にcommit、失敗時にpartial outputを削除してrollbackします。この反映はVite 8.2.1との全compatibility plugin、Preact、plugin mismatchのintegration testで固定します。

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
