# ADR-0023: docsをバージョン別にビルドしてCloudflare公開用branchへ合成する

- Status: Accepted
- Date: 2026-10-06

## Context

v5のmain移行時にGitHub Pagesのbuildを停止し、最新docsとv3／v4 archiveを同一domainの`/`・`/v3/`・`/v4/`へ公開する。最新docs更新のたびにarchiveを再ビルドせず、他の対象の成果物を削除しない公開処理が必要。

## Decision

GitHub Actionsで各ソースbranchの固定SHAを独立してビルドし、cloudflare branchのpublic directoryへ対象だけ差し替える。公開directory外のschemaVersion付きstateへ対象ごとのSHAと公開処理hashを記録し、最後に成功したビルドとの差分で対象を選択する。初回と公開処理変更は全対象を揃える。公開処理全体を共通concurrency groupで直列化し、cloudflare headの変更検知と通常pushで上書きを防ぐ。

archive側は小さな入口workflowでmainのrepository_dispatchを起動する。共通処理はmain側に集約し、archiveの依存・Node runtime・CLI手順を分離する。archive baseの補正はCI checkoutと生成成果物に限定し、minista本体の公開API・Vite adapter・feature間の契約へ持ち込まない。

## Consequences

main更新でarchiveは既存成果物を保持する。Cloudflareへ渡すsnapshotは常に全対象を含む。ビルド・検証失敗時に旧公開を変更しない。archive入口の追加とCloudflareのGit連携・DNS設定は、v5側のworkflow追加とは別の導入手順になる。詳細は[docs-deployment.md](../docs-deployment.md)。

## Rejected alternatives

- 更新ごとに3バージョンを再ビルドする: archive依存の経年変化に最新docs公開が毎回依存し、不要なbuildが増える。
- cloudflare branchの全directoryを最新docsで置換する: archiveを削除してしまう。
- Actions artifact／cacheだけをarchiveの永続保管先とする: 保持期間やcache失効によって復旧buildが必要になる。
- ソースbranchごとに公開branchへ独立pushする: snapshotの競合と更新取りこぼしを招く。
