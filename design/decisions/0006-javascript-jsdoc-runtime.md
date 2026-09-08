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


## 公開宣言の配布契約（2026-09-08）

公開宣言が参照する`@types/archiver`／`@types/js-beautify`はministaのdependenciesに置き、workspace rootのdevDependenciesに依存させません。Reactの型はconsumerが使用するReactに対応した`@types/react`／`@types/react-dom`を選択します。

SSGのMDX optionはcompile用のshapeを隣接`mdx-options.d.ts`で定義します。`@mdx-js/mdx@3.1.1`の公開entryは評価用の型も読み込み、`@types/mdx@2.0.14`のglobal JSX参照がReact 19の型で解決できないためです。公開されていないMDX内部subpathへの依存やglobal JSXの追加は採用しません。optionのkey集合と双方向の代入互換性を上流`CompileOptions`と比較するsource-level型テストで追跡します。直接参照する`unified`／`remark-rehype`も配布依存に明記します。compiler実装では引き続き上流型を使用します。

`minista/client`のMD／MDX宣言はSSG配下に置きます。公開entryのexport名とoption shapeは維持し、既存の内部補助型exportも削除しません。SSGの内部`ResolvedPage`が使う`PageId`はGraph barrelを経由せずID宣言を直接参照します。公開optionにrecipeやGraph型は要求しません。

`npm run test:public-types`はpackしたpackageをリポジトリ外の空consumerへインストールし、React 19で`strict:true`／`skipLibCheck:false`の検査を実行します。全10プラグイン、component、公開page型、client宣言と不正値の拒否を対象とし、通常CIで実行します。上流型との比較は通常の`typecheck`で実行し、配布型の厳格検査と分けます。

上流のglobal JSX参照は[DefinitelyTypedのMDX宣言](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/mdx/types.d.ts)でも確認しました（2026-09-08）。上流のReact 19対応後はcompile optionの直接importへ戻せるか再検討します。
