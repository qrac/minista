# ADR-0022: SSGのpublicアセット参照へbaseを適用する

- Status: Accepted
- Date: 2026-09-16
- Amends: [ADR-0004](0004-plugin-api-compatibility.md)、[ADR-0013](0013-ssg-page-formats-and-render-assets.md)、[ADR-0019](0019-ssg-entry-composition.md)

## Context

SSGの生成HTMLはViteの入力HTMLではなく出力assetとして登録されるため、Vite標準のpublic URL補正を通らない。`base: "/test/"`や`base: "./"`でも`/logo.svg`が残り、サブディレクトリや相対パスでの公開時に参照先が外れる。既存のrender画像用planへpublicファイルを混ぜると、出力所有権とEntryのsource解決も混同する。

## Decision

`pluginSsg()`の標準機能として、client preparation後、HTMLのemit前にpublic参照を合成する。公開optionと新しいfeature descriptorは追加しない。

- `adapters/vite/ssg-public-assets.js`が補正の必要なbuildで解決済み`publicDir`を一度探索する。`base: "/"`では探索・変換を省略する。カスタムdirectory、無効化、存在しないdirectoryに対応し、catalogをprocess global stateへ保存しない。探索失敗は`MINISTA_SSG_PUBLIC_ASSETS_FAILED`とする
- `features/ssg/public-assets.js`はpublic fileのSetとURL resolverを受け、既存のHtmlDocumentを変換する。Vite／filesystemをimportしない
- `base`はViteの設定だけを使い、`getBasedAssetUrl()`で最終HTMLの`fileName`から解決する。`/`、path base、CDN URL、`./`と空文字を扱う。相対URLの先頭`./`は既存関数に合わせて省略する
- 対象はroot absolute URLのうちpublicに実在するfileだけとする。判定時だけpercent encodingをdecodeし、出力には元のencoding、query、fragment、srcsetのdescriptorと空白を保持する。外部URL、data URL、fragmentのみ、相対参照、欠落fileは保持する
- URL属性は画像、link、script、audio／video、track、embed、object、input、SVG image／use、assetを指す限定的なmetaを対象にする。`a[href]`もpublic実ファイルへのリンクだけ対応する。通常のページリンク、form action、独自data属性は変更しない
- style属性と`<style>`内の通常の`url()`を補正する。コメント、文字列内の`url(...)`、CSS escape付きURL、`@import`の文字列、image-setの文字列は変換しない。CSS全体のcompile機能は追加しない
- Entryがclient inputへ登録済みのsourceはEntryに任せ、rootとpublicの同名fileは従来どおりroot側を優先する。Entryからsource集合を明示的に受け取り、HTMLを再解析してEntry planを作り直さない
- Island featureが`selectIslandContent()`で所有するsubtreeを返し、adapterが除外集合としてSSGへ渡す。カスタムroot属性名にも対応する。SSR HTMLだけの変換によるhydration不一致を避け、propsとclient runtimeは変更しない。`client:only`のfallbackを含めて同じ境界とする
- public file本体のコピーはViteのclient buildが引き続き所有する。新しいArtifact、output claim、feature間のHTML marker、temporary file、plugin順序依存を作らない。通常app／legacy／外部CLIは共通のclient buildStartから処理し、devの`transformIndexHtml()`へ重ねて適用しない

単一URL／srcsetのrange分解はCoreのDocument utilityへ分離し、EntryとSSGが共有する。Entryの要素・属性contract自体は変更しない。

## Consequences

JSX／MDXで`/logo.svg`を指定したままbaseを切り替えられる。例えば`demos/index.html`は`base: "./"`なら`../logo.svg`、`base: "/test/"`なら`/test/logo.svg`を参照する。publicファイル内のCSS／JS／JSON／HTMLに書かれたURLと、ブラウザ実行時に生成するURLは利用者が管理する。

既にbaseを付けたURLを再度補正しない。base付きURLと同名のpublic fileが存在する場合も、既存public fileのbase付き参照として解釈できればそちらを優先する。

## Rejected alternatives

- 生成HTMLをViteのHTML入力に変更する: Entryの収集・bundle責務まで変更するため採用しない
- 全てのroot absolute URLを置換する: ページ遷移、API path、独自属性まで変更するため採用しない
- publicファイル本体を再compileする: 無加工コピーの契約を壊すため採用しない
- IslandのHTMLだけを書き換える: client props／componentの出力と一致しなくなるため採用しない

## Validation

public参照のpure composition、既存EntryのURL境界、catalogの再作成・無効化をunit testで検証する。SSG／Entryの対象integrationでapp／legacy／外部CLIのpath base、カスタムpublicDirとネストpageの相対base、devでの二重base回避を確認する。
