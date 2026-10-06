# ADR-0021: IslandのpropsをSSR時にserializationする

- Status: Accepted
- Date: 2026-09-15

## Context

従来は`client:*`を付けたJSX全文を切り出し、使用するコンポーネントのimportを加えたsnippetをclientで再実行していた。ページの変数、`getStaticData()`の結果、ループ変数はsnippetのscopeに存在しない。同じコンポーネントでもpropsやdirectiveの違いによって別sourceになっていた。

## Decision

コンポーネント参照とインスタンスの値を分離する。

1. AST adapterは静的import（default／named／namespace member）またはHTMLタグを特定する。client entryはimport、component参照配列、rootのexportだけで構成し、ページの式やJSXをコピーしない。
2. 元のscopeにJSXを残し、評価したelementをReact adapterの`IslandBoundary`へ渡す。boundaryはpropsを一度serializationしてから、同じelementを通常のpage tree内でrenderする。二重render、closure抽出、global registryは使わない。明示的なJSXの`key`は外側boundaryへ移す。
3. `data-<prefix>client-props`はbrowser向けのversion付きdataであり、rendererの属性escapingを使う。HTMLやscript文字列へpropsを連結せず、復元にevalを使わない。
4. 条件成立時に既存のliteral dynamic importでcomponentとrendererを取得し、対象要素のpropsを復元して`createElement(Component, props)`をhydrate／mountする。componentの取得Promiseだけを共有し、インスタンスのpropsを共有しない。

### 値のcontract

payloadは`{ schemaVersion: 1, props: WireValue }`。primitiveはstring／有限number／boolean／null、その他はtagged arrayで表現する。undefined、負のゼロ、配列のhole、plain object（null prototypeを含む）を保持する。objectはkey/value配列なので利用者のキーと内部tagは衝突しない。復元時はown propertyを定義し、`__proto__`によるprototype変更を避ける。

JSX childrenとJSX-valued propsはelementのtype／key／propsへ分解する。typeはHTMLタグ、Fragment、当該IslandのJSXに現れる静的import参照に限定する。React固有の内部fieldは保存しない。clientでaliasされたReact／Preactの`createElement`を使って復元する。子コンポーネントはserializationのためにはrenderしない。

関数、symbol、BigInt、非有限数値、Date／Map／Set／RegExp／class instance、accessor、循環参照は`MINISTA_ISLAND_PROPS_UNSUPPORTED`。診断はpropsのpathを含み、値そのものは含めない。壊れたpayload／非対応versionは`MINISTA_ISLAND_PROPS_INVALID`。ページからイベント関数を渡す旧snippetの使い方は廃止し、イベントをIslandコンポーネント内へ置く。

同じファイルで定義したコンポーネントや動的なcomponent選択はclient importとして解決できないため`MINISTA_ISLAND_COMPONENT_UNRESOLVED`。一つの要素への複数directiveは`MINISTA_ISLAND_DIRECTIVE_CONFLICT`。同じJSX内のboundaryの入れ子はDOM所有権が重複するため`MINISTA_ISLAND_NESTED`で拒否する。fallback内の独立したIslandは許可する。

### client directivesとclient:only

load／idle／visible／media／onlyの起動条件、page分割、root option、遅延CSS取得は維持する。directive parameterの式も元のscopeで評価する。

`client:only`でもpropsとJSX childrenの式はサーバーで評価・serializationするが、本体コンポーネントはrenderしない。直下の`slot="fallback"`要素を本体childrenから除き、SSRでだけ表示する。静的importのmodule評価を抑止するAPIではないため、module top-levelでbrowser globalを使うコードは保証しない。

### Core／Vite／handoff

公開`pluginIsland()`と型optionは変更しない。CoreへReact／Viteを持ち込まない。既存のIsland source plan、Graph、Artifact Store、analyze→generate→bundle→composeを維持する。内部の`snippet`という名称とencoded markerは既存compatibility facadeのまま保持するが、内容はprops非依存のcomponent entryに変わる。新たなfeature間HTML protocol、temp file探索、global stateを導入しない。

既存のbuild sessionと外部CLI JSON handoffは文字列配列を運ぶcontractを維持する。propsはRenderedPageの最終HTML属性として渡り、公開Graphへ値を複製しない。payload versionを非互換に変更する際はSSR／clientの両側を同じ変更で更新する。過去の生成cacheは再buildする。

### dev／HMR

SSR boundaryへの変換はserver environmentに限定し、browserのcomponent moduleにserver helperを混入させない。propsの式の変更は既存SSG invalidation／page reloadで再renderされ、同じcomponent entryを使って新しいpayloadを読む。componentの更新はVite／React pluginの更新経路を使う。遅延開始前にDOMが切り離された場合は既存guardでhydrateしない。

hydrate直前の既存HTML空白正規化は維持する。SSRとclient初期renderの一致を契約とし、formatterと有意な空白の扱いは本変更で再設計しない。

## Rejected alternatives

- 外部変数の宣言・関数・importをsnippetへ再帰的にコピーする: サーバーの処理をclientへ持ち込み、closure／bundlerの再実装になる。
- `JSON.stringify(props)`だけで済ませる: undefined、関数、非有限数値が黙って欠落／変換され、JSX childrenとReact／Preact境界も扱えない。
- childrenをrender済みHTMLへ置き換える: 子コンポーネントのidentityとイベント／状態を復元できない。
- 全特殊型と任意のReact treeに対応する: 初期contractと保守範囲を拡大し過ぎる。必要な用途が出た時点でwire schemaの拡張を検討する。

## References

- [React hydrateRoot](https://react.dev/reference/react-dom/client/hydrateRoot): SSRとclient初期renderの一致、空のrootではcreateRootを使う契約（2026-09-15確認）。
- [ADR-0002](0002-project-graph-and-phases.md)、[ADR-0005](0005-react-static-renderer.md)、[ADR-0012](0012-json-external-build-handoff.md)

## 検証結果

2026-09-15実行、2026-09-16記録。対象をIslandに限定して確認した。

- unit 33件: serialization／復元、escaping、JSX children、未対応値、import参照とshadowing、directiveの起動条件、インスタンスごとのpayload受け渡し。
- integration 4件: page分割の有効／無効、propsの実値とcomponent entry共有、SSR失敗時のdiagnostic保持、Preact向けlegacy build。
- 変更したruntime／transformと対象testの型チェック成功。Core全体の型チェックは変更していない`mdx-transform.js`、`ssg-entry.js`、`shared/url.js`の既存エラーにより失敗。
- Island fixtureの`minista check --json`と既存Island playgroundのbuild成功。
- devの実ブラウザでvisible条件成立前は未読込、成立後はcomponent評価1回／2インスタンスのhydrate、変数propsからのクリック操作、ページprops変更とcomponent編集の自動更新を確認。client:onlyのspread propsも確認。
- Preactのbuild出力を実ブラウザで確認。React SSR由来のpropsとJSX childrenを復元し、初期値5からクリックで6へ更新。上記browser確認でconsoleのwarning／errorはなし。

全integration、互換性matrix、全playground buildは実行していない。docsのMDXは依頼に従い日本語版だけ更新した。
