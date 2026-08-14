# v5 architecture release notes

最終確認日: 2026-08-14

この文書はv5のAIコーディングネイティブ基盤への再設計で完了した変更を要約します。現在の詳細なcontractは [`architecture.md`](architecture.md)、Vite固有の判断は [`vite.md`](vite.md)、判断理由は [`decisions/`](decisions/) を参照してください。

## Sourceとpublic type

- runtime implementationをJavaScript／JSX + JSDocへ統一
- 必要なpublic typeを隣接`.d.ts`に分離
- package entry、CLI、testから`src/`を直接実行し、事前buildを不要化
- Coreのgraph、lifecycle、diagnostics、Artifact、manifest、queryをVite非依存に分離

## Build lifecycle

- 通常buildを単一processのVite App Buildへ移行
- render／client environment間をbuild session、Project Graph、Artifact Storeで接続
- feature descriptorのcapability、`requires`、`after`からphase順を決定
- partial outputを防ぐoutDir transactionとstable diagnosticを実装
- `.minista/manifest.json`と`.minista/diagnostics.json`を安全かつatomicに出力

## Dev lifecycle

- programmatic custom serverとModuleRunner adapterへ移行
- route／page単位のdiscovery、resolve、render cacheを実装
- module graphから影響RouteNodeを解決し、URL単位reloadを実装
- server lifetimeのDocument、Graph、Artifact、diagnostics、traceをfeature間で共有
- page scope付きArtifactによりSprite、Image、Islandの集約出力をincrementalに再生成

## Feature migration

SSG、Comment、Svg、Beautify、Archive、Search、Sprite、Image、Entry、Bundle、Islandは、公開`pluginXXX()`を維持したままCore featureとVite adapterへ分離しました。domain処理は`analyze`、`generate`、`render`、`bundle`、`compose`、`finalize`の明示phaseで実行します。

MDXはHTML／outputを扱わないため、`@mdx-js/rollup`を包むcompiler adapterとしてVite境界に残します。

## Dataとdiagnostics

- executable temp module handoffを削除し、`RenderedPage` Artifactまたはschema付きJSONへ移行
- output claimからPage、Artifact、Asset、出力fileの関係をProject Graphへ統合
- `check`、`inspect`、`explain`とJSON出力を共通query serviceへ接続
- Vite、filesystem、HTML parser、image、sprite、SVG、archiveの失敗をstable code付きdiagnosticへ正規化
- tool向けread-only queryを`minista/internal/query`から公開

## Compatibility policy

公開plugin API、option default、page／layout contract、出力URLを互換対象として維持します。旧`--oneBuild`は削除し、指定時は`MINISTA_CLI_OPTION_REMOVED`を返します。

互換fallbackはViteのexperimental API変更に備えた2経路だけを保持します。新規fallbackは追加せず、発動条件と削除条件は [`vite.md`](vite.md#retained-compatibility-fallbacks) で管理します。

## Verification

Core／featureのunit test、公開API type test、代表fixtureのbuild、programmatic／fallback build、dev HTTP／HMR、manifest／diagnostic snapshotを通常suiteで検証します。最低限のrepository検証は次です。

```sh
npm test
npx tsc --noEmit
```
