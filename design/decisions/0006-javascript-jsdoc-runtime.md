# ADR-0006: ランタイム実装をJavaScript + JSDocに統一する

- Status: Accepted
- Date: 2026-08-12

## Context

v5の初期Core prototypeはTypeScript sourceとして追加し、package runtimeを `dist/` から実行する構成を試しました。この構成ではCLIやtestの前にcompileが必要になり、小さな変更の検証でも待ち時間とstale outputの確認が増えます。既存ministaはJavaScript + JSDocと隣接 `.d.ts` で、sourceを直接実行できる開発体験を持っています。

## Decision

- runtime implementationは `.js` / `.jsx` + JSDocを標準とする
- public typeは既存APIと同様に隣接する `.d.ts` で維持する
- internal typeはJSDoc typedef/importとし、必要な場合だけinternal `.d.ts` を置く
- package entry、CLI、testは `src/` を直接参照する
- `npm test` と通常のCLI実行にcompile stepを要求しない
- `tsc --noEmit` はsource-level typecheckとして維持する
- 初期TypeScript prototypeをJavaScript + JSDocへ移し、以後のruntime実装も同じ形式で追加する

## Consequences

- 編集からunit/integration testまでにruntime buildが不要になる
- `dist/` のstale artifactを誤って検証する危険がなくなる
- JSDocで表現しにくいbranded typeやdiscriminated unionは、型専用 `.d.ts` と小さなruntime assertionに分離する必要がある
- implementationとdeclarationのずれは `tsc --noEmit` とpublic API type testで検出する

## Rejected alternatives

### package全体をTypeScript build前提にする

型と実装を一つのファイルに置けますが、通常のtestとCLI検証にcompile stepが入り、現在の開発ループを遅くするため採用しません。

### 開発時だけTypeScript loaderを必須にする

実行環境とpublish artifactの経路が分かれ、loader固有の挙動を追加で検証する必要があるため採用しません。

## Reconsider when

Node.jsが型注釈を含むsourceを追加loaderなしで安定実行でき、compile stepなしという条件を維持したままpackage配布とeditor supportを簡素化できる場合に再検討します。
