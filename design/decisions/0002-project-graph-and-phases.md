# ADR-0002: Project Graph と明示的 Build Phase

- Status: Accepted
- Date: 2026-08-12

## Context

現行 feature の共有値は主に `{ url, fileName, html }` で、asset / island / image / client entry は HTML を再解析して推測します。feature 間の順序は Vite plugin 配列、`enforce`、hook timing、temp file の存在に埋め込まれています。

## Decision

versioned Project Graph、Artifact Store、structured Diagnostic を lifecycle の中心にします。phase は `discover`, `resolve`, `render`, `analyze`, `generate`, `bundle`, `compose`, `emit`, `finalize` とします。

- graph node は決定的な branded ID を持つ
- phase ごとに read model と許可された command を限定する
- feature は capability と dependency を宣言し topological sort する
- HTML は final output か document representation であり、feature 間の唯一の protocol にしない
- `.minista/work/<buildId>` は metadata 付き ArtifactStore とし、glob で前回 build の executable file を探さない
- public manifest は graph の安全な projection とする

## Consequences

- route から output artifact まで機械的に追跡できる
- order cycle、missing capability、artifact conflict を build 前に診断できる
- model/schema design と migration policy が必要になる
- HTML parser だけで完結していた小機能も node ownership を意識する必要がある

## Rejected alternatives

### Event bus のみを導入する

producer/consumer の時間的結合は弱まりますが、最終状態と dependency edge を query できず、replay / inspect / explain に不十分です。

### すべて immutable snapshot として複製する

安全ですが、page/asset 数が多い project で memory cost が高くなります。外部には readonly view を渡し、内部 command handler が検証付きで更新する方式を採用します。

### HTML AST を Project Graph 全体として永続化する

parser implementation と schema が強く結合し、manifest が巨大になります。HTML document は build session 内 artifact とし、public manifest には reference と要約だけを残します。

## Reconsider when

phase の間に必須 data dependency が表現できない実例が出た場合、phase 追加より先に既存 phase の input/output または capability model を再検討します。
