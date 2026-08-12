# ADR-0004: 公開 plugin API を compatibility facade として維持

- Status: Accepted
- Date: 2026-08-12

## Context

利用者は Vite config の `plugins` に `pluginSsg()`, `pluginMdx()`, `pluginImage()` 等を並べています。内部を feature system に変えるために API を一括変更すると、v5 migration cost が過大になります。一方、現行 plugin order を永続的な domain contract にすると暗黙依存を固定化します。

## Decision

既存の `pluginXXX()` 名、主要 option shape、default、component import、`defineConfig()` を維持します。戻り値は引き続き Vite が受け取れる `PluginOption` ですが、内部では marker 付き feature descriptor と薄い adapter を生成します。

- user の配列順は Vite source transform の通常 semantics には従う
- Minista domain phase の順序は feature dependency graph で決める
- `pluginMdx()` の配列 return を含む現行 runtime shape は移行期間の compatibility test で保護する
- accidental internal contract (`.minista` path、virtual ID、plugin name、generated source name) は互換対象外
- documented output URL / HTML semantics の変更は migration note と diagnostic を必要とする
- `--oneBuild` は v5 lifecycle 移行後に deprecate する

## Consequences

- 大半の user config は変更不要
- 旧 plugin と新 feature の用語が移行期間中に併存する
- Vite plugin を直接 introspect する非公式 integration は壊れる可能性がある
- option type test と golden fixture が compatibility gate になる

## Rejected alternatives

### `features: []` という新 config へ一括移行する

内部 model は明快ですが、既存 project を不必要に破壊するため却下します。将来 additive shorthand として提供することは妨げません。

### plugin 配列順をそのまま phase 順とする

循環や missing dependency を検出できず、AI が安全に局所変更できる構造になりません。

## Reconsider when

次の major で Vite plugin 以外の public configuration が十分普及した場合でも、deprecated period と codemod なしに既存 facade を削除しません。
