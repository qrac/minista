# ADR-0014: Layoutのdocument rootを既存Head APIと合成する

- Status: Accepted
- Date: 2026-08-28

## Context

従来のSSG rendererはLayoutとPageのrender結果を常にMinista既定の`html`／`head`／`body`で囲み、document属性とhead要素の変更には`Head`コンポーネントを使用していました。そのため、Layoutを完全なHTML documentとして記述するとdocument rootが二重になりました。

既存projectの部分Layoutと`Head` APIを維持しながら、Layoutでdocument shellを直接管理できるcontractが必要です。

## Decision

Layoutのrender結果がrootの`html`要素を持つ場合、SSGはその結果をdocument layoutとして使用します。

- rootに`html`がない場合は、従来どおりMinistaが既定の`html`／`head`／`body`を補う
- document layoutの`html`／`head`／`body`とその属性・子要素を維持する
- doctypeはrendererの種類にかかわらず1つだけ出力する
- `Head`の`htmlAttributes`／`bodyAttributes`はLayout直書きの属性へ後から適用する
- `Head`のhead要素はLayout直書きの`head`末尾へ追加する
- `title`、`meta[charset]`、`meta[name="viewport"]`は1つに正規化し、`Head`側を優先する
- head内ではcharsetを先頭、viewportをその次へ配置する
- charsetとviewportがLayoutにも`Head`にもない場合だけ既定値を補う

判定と合成はSSG render境界で行い、CoreへReactやViteの型を持ち込みません。HTMLのqueryとmutationには既存の`HtmlDocument` portを使用します。

## Consequences

- 既存の部分Layoutと`Head`のみを使うprojectのdocument wrapperは維持される
- Layoutは追加optionなしで完全なHTML documentを表現できる
- Layout直書きと`Head`を併用した場合の優先順位が安定する
- `title`、charset、viewportの意図しない重複は従来モードでも解消される

## Rejected alternatives

### `document: true` optionを追加する

sourceと設定の二箇所で同じ意図を表現する必要があり、設定とLayout markupが不一致になり得るため採用しません。

### Layoutの`head`を使う場合は`Head`を無効にする

ページごとのtitleやmetadataを既存APIで上書きできず、移行互換性を損なうため採用しません。

### HTML文字列の置換だけで合成する

属性やhead要素の構造を安全に扱えず、既存の`HtmlDocument` portを迂回するため採用しません。
