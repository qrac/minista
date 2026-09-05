# ADR-0004: 公開plugin APIをcompatibility facadeとして維持

- Status: Accepted
- Date: 2026-08-12
- Amended: 2026-08-28 by [ADR-0013](0013-ssg-page-formats-and-render-assets.md)
- Amended: 2026-09-05 by [ADR-0015](0015-application-lifecycle-and-output-transaction.md)

## Context

利用者はVite configの `plugins` に `pluginSsg()`, `pluginMdx()`, `pluginImage()` 等を並べています。内部をfeature systemに変えるためにAPIを一括変更すると、v5 migration costが過大になります。一方、現行plugin orderを永続的なdomain contractにすると暗黙依存を固定化します。

## Decision

既存の `pluginXXX()` 名、主要option shape、component import、`defineConfig()` を維持します。戻り値は引き続きViteが受け取れる `PluginOption` ですが、内部ではmarker付きfeature descriptorと薄いadapterを生成します。

- userの配列順はVite source transformの通常semanticsには従う
- Minista domain phaseの順序はfeature dependency graphで決める
- v5でSSGの入力形式とrender asset保証へ統合された`pluginMdx()`／`pluginBundle()`は例外として削除する
- `pluginSsg()`のpath optionはproject root相対のslashなしをdefaultとし、従来の先頭slash付き表記もVite adapter境界で同じroot pathへ変換する
- accidental internal contract (`.minista` path、virtual ID、plugin name、generated source name) は互換対象外
- documented output URL / HTML semanticsの変更はmigration noteとdiagnosticを必要とする
- `--oneBuild` はv5で削除し、指定時は `MINISTA_CLI_OPTION_REMOVED` errorを返す

全descriptorを検証するadapter coordinatorがdomain output operationを依存順にdispatchします。source transformの通常Vite順序とは分離します。isSsrBuildを参照するconfigは既存Legacy経路を使用し、builder.buildApp callbackはMinistaが所有します。詳細はADR-0015を参照してください。

## Consequences

- 大半のuser configは変更不要
- 旧pluginと新featureの用語が移行期間中に併存する
- Vite pluginを直接introspectする非公式integrationは壊れる可能性がある
- option type testとgolden fixtureがcompatibility gateになる

## Rejected alternatives

### `features: []` という新configへ一括移行する

内部modelは明快ですが、既存projectを不必要に破壊するため却下します。将来additive shorthandとして提供することは妨げません。

### plugin配列順をそのままphase順とする

循環やmissing dependencyを検出できず、AIが安全に局所変更できる構造になりません。

## Reconsider when

次のmajorでVite plugin以外のpublic configurationが十分普及した場合でも、deprecated periodとcodemodなしに既存facadeを削除しません。
