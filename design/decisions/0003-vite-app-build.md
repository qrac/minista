# ADR-0003: Vite App Build による単一 lifecycle

- Status: Accepted with compatibility fallback
- Date: 2026-08-12

## Context

現行 CLI は `vite build --ssr` と `vite build` を別 process で連続実行します。失敗、diagnostic、cache、cleanup が二分され、feature は filesystem の temp module で状態を渡します。

Vite 8.2.1 は Environment API、App Build、`createBuilder()`、`buildApp()` を提供します。ただし Environment API 全体は RC で、`createBuilder` と `buildApp` hook、shared build option は型上 experimental です。

## Decision

v5 build adapter は `render` と `client` environment を一つの Minista application lifecycle で順に build します。CLI は programmatic `createBuilder()` を使い、一つの BuildResult と diagnostic collection を返します。

- render と client bundle の物理分離は維持する
- inter-environment data は ProjectContext / versioned ArtifactStore で渡す
- experimental shared plugin / shared config state には依存しない
- adapter の Vite minor matrix と、移行期間中の isolated legacy adapter を持つ
- Core phase は `buildApp` hook の存在や順序を知らない

## Consequences

- Vite CLI の二回 spawn と executable temp handoff を削除できる
- render 結果に基づき client entry を決める順序を一箇所で管理できる
- Vite experimental API change への追従が adapter に必要
- user config の `isSsrBuild` 分岐に compatibility translation が必要

## Rejected alternatives

### render/client を一つの bundle に統合する

runtime target と output の目的が異なり、不要な複雑性を生みます。単一 lifecycle は単一 bundle を意味しません。

### 現行二 process を維持して manifest だけ改善する

data contract は改善できますが、一 configuration / diagnostic / cleanup lifecycle という目的を満たしません。

### shared plugin state のみで environment 間を連携する

Vite の shared option は experimental で、Core の再利用性と process isolation を損ないます。optimization として将来検討する余地だけ残します。

## Reconsider when

- Vite が App Build API を置換または削除した場合
- Vite の stable orchestration API が同じ要件をより少ない adapter code で満たす場合
- render bundle を作らず安全に production module evaluation できる stable API が提供された場合
