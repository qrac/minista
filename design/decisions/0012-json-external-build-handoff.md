# ADR-0012: 外部buildのdata handoffをschema付きJSONにする

- Status: Accepted
- Date: 2026-08-13

## Context

通常のApp Buildとprogrammatic legacy fallbackは同一processの`MemoryArtifactStore`でrendered pagesとIsland snippetsを渡します。一方、未対応CLI flagからVite CLIを二回起動するfallbackではprocess memoryを共有できず、`.minista`へJavaScript moduleを書き、client processがdynamic importしていました。

この方式はdata受渡しのためにcode executionを必要とし、schema validationがなく、globで過去buildのfileを拾う可能性がありました。

## Decision

外部fallbackのrendered pagesとIsland snippetsを`.minista/work/<buildId>/external`のschema付きJSON snapshotとして保存します。各snapshotは`schemaVersion`と`kind`を持ち、client processは期待するfieldを検証してからdataとして読みます。不正JSONまたはschema不一致は`MINISTA_EXTERNAL_HANDOFF_INVALID`を持つerrorにします。

親CLIが生成するbuildIdをrender/client processへ渡し、両processは同じscopeだけを読み書きします。manifest候補の昇格後または失敗時にbuildId directory全体を削除します。通常buildのArtifactStore経路は変更しません。

render用SSR bundleはpage module評価の実行codeなのでこのhandoffには含めません。削除対象はrendered pagesとsnippet dataをexportしていた実行可能moduleです。

## Consequences

- EntryとIslandはphase間dataをdynamic importしない
- 前回buildのsnapshotをglobで探索しない
- process間handoffをschema versionとstable error codeで検証できる
- snapshotはprivate workspace dataであり、公開Project ManifestへHTMLやsnippet本文を含めない
- 外部fallbackが残る期間も通常buildと同じdata contractを維持できる

## Rejected alternatives

### JavaScript moduleを継続して厳密なfile nameだけ指定する

globによる誤読は防げますが、data読込にcode executionが必要な問題を解消しないため採用しません。

### 公開Project Manifestをrender/client handoffに使う

公開manifestは安全なallowlist projectionであり、HTML本文やencoded snippetを含めるべきではないため採用しません。

### 外部fallbackを同時に削除する

未対応Vite CLI flagの互換経路を一度に失うため、先にhandoffを安全化してから別の移行条件で削除します。

## Reconsider when

- programmatic buildが対応対象のVite CLI flagをすべて扱い、外部fallback自体を削除できる場合
