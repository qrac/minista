# プラグインの設計・機能・依存改善計画

- 作成日: 2026-09-08
- 対象: minista v5の公開10プラグインと内部feature／adapter
- レビュー時点のHEAD: `22118d9`
- 状態: 計画を文書化済み。P01〜P06完了。P07〜P11は未着手
- 目的: 別のチャットやcontributorが、会話履歴なしで根拠・着手順・完了条件を把握できるようにする

## 結論と前提

公開プラグインの分割、SSGへのMDX／render asset統合、CoreとVite adapterの分離は維持する。最初に出力の正しさと公開型の配布契約を修正し、その後に未使用依存の読み込みと実行性能を改善する。

この文書は今後の計画であり、実装済みの仕様や新しいADRの代わりではない。実装時は最新のcodeとtestで問題が残っているか確認する。APIや出力semanticsを変更する項目は、同じ変更で該当ADR・設計資料・公開docs・migration noteを更新する。

前提資料:

- [設計資料の入口](../README.md)、[現在の構造](../architecture.md)、[Vite境界](../vite.md)
- [ADR-0001: Core / Feature / Vite Adapter](../decisions/0001-core-feature-vite-adapter.md)
- [ADR-0004: 公開plugin API](../decisions/0004-plugin-api-compatibility.md)
- [ADR-0010: output claim](../decisions/0010-explicit-output-claims.md)
- [ADR-0013: SSGへのpage format／render asset統合](../decisions/0013-ssg-page-formats-and-render-assets.md)
- [ADR-0015: lifecycleとoutput transaction](../decisions/0015-application-lifecycle-and-output-transaction.md)

## プラグイン別の判断

| プラグイン | 維持する責務・依存 | 改善対象 |
| --- | --- | --- |
| SSG | route／render／MDX／render assetのcomposition root。`@mdx-js/mdx`、frontmatter構文・AST変換、YAML／TOML parser | 重い依存の遅延ロードの基準例とする。SSG自体の公開API分割は行わない |
| Entry | HTMLに明示されたasset参照のclient bundle。Viteの既存bundler | SSGとの役割の説明、収集対象と書換え対象の整合性、参照走査の効率 |
| Image | Image／Picture、レスポンシブ画像、cache、bounded concurrency。Sharp | 未使用時の読み込み、既定値とremote cache方針の説明 |
| Svg | inline SVG合成。SVGO | ルート属性保持、dev cache無効化、missing source診断、内部ID |
| Sprite | 再利用する外部SVG sprite。SVGO、tinyglobby | symbol重複診断、内部ID、Svgとの解析処理共有 |
| Comment | HTML comment合成。専用の外部依存は不要 | 現状維持。他項目のために公開APIを統合しない |
| Island | ページ別entryとhydration directive。Vite parser、MagicString | 条件成立時のmodule取得・評価、dev／buildのruntime重複 |
| Search | 静的検索indexと任意のReact UI。mojigiri | 除外処理、辞書参照、query処理とUIの内部境界 |
| Beautify | 納品用HTML／CSS／JS整形。js-beautify | preload方針との分離、formatter adapter、JS sourcemap整合性 |
| Archive | ZIP／TAR配布物生成。archiver | 既定入力先、欠落診断、大容量時のメモリ使用 |

## 調査で確認したこと

「再現済み」は小さな直接実行での結果を指す。fixtureによるbuild／dev全経路の回帰テストが既にあるという意味ではない。

| 対象 | 証拠の区分 | 観測結果 |
| --- | --- | --- |
| Search除外 | 再現済み | 同じ親の下の`.skip`要素2件のうち、2件目の本文が残った。除外した1件目も`words`に残った |
| Svg属性 | 再現済み | 元SVGのルートにある`fill="none"`／`stroke="currentColor"`が合成結果から消えた |
| Svg cache | 再現済み＋実装確認 | 同じresolverでsourceを変更しても以前のviewBoxが返った。devはserver lifetimeのresolverを再利用し、無効化処理がない |
| Archive入力 | 再現済み＋実装確認 | 存在しない`dist`をNodeArchiveBuilderに渡すと、22バイト・0 entryのZIPを正常生成した。pluginの既定入力は`dist`固定 |
| 公開型 | 型検査で再現済み | Island／Beautifyの型import先に対応する宣言がなくTS7016。MDXの依存型からJSX namespaceエラーも出た |
| 公開型の依存配置 | manifest確認 | 公開宣言が参照する`@types/archiver`／`@types/js-beautify`がmonorepo rootのdevDependenciesにしかない。独立consumer検証は未実施 |
| 未使用依存 | import経路確認＋一部実測 | package entryをimportするだけでformatter実装等が読み込まれる。Image adapterからSharpへの静的import経路もある |
| Island | 実装確認 | `visible`／`media`等でも生成entryはsnippetを静的importし、hydration開始だけを遅延する。通信量の実測は未実施 |
| Search辞書 | 実装確認＋参考測定 | `words.indexOf()`を繰り返す。1ページ相当の合成データで1,000語約12ms、5,000語約216ms、10,000語約707ms。単発・他処理並行の参考値で、正式benchmarkではない |
| Beautify | 実装確認 | 既定でbody直下のimage preloadを除去する。JSは生成済みchunkの`code`を変更し、同じ箇所ではmapを更新しない |
| Sprite／Entry | 実装確認、追加検証が必要 | Spriteは同名symbolをMapへ上書きする。Entryは収集する属性とcomposeで書き換える属性の範囲が異なる |

## 着手順と作業単位

チェックを完了にする際は、対応commitまたは変更内容・実行した検証・残る制限を各項目に追記する。部分完了の場合は未完了の条件を明記する。

| 状態 | ID | 優先度 | 作業 | 依存・順序 |
| --- | --- | --- | --- | --- |
| [x] | P01 | 高 | Searchの除外とquery処理を修正 | 最初の修正群 |
| [x] | P02 | 高 | Svgの属性保持とdev更新を修正 | 最初の修正群 |
| [x] | P03 | 高 | Archiveの入力解決と欠落診断 | 最初の修正群 |
| [x] | P04 | 高 | 公開型と配布依存を修正 | 最初の修正群 |
| [x] | P05 | 中 | 重い依存を遅延ロード | P04後を推奨。公開型への影響も検証 |
| [x] | P06 | 中 | Search辞書と内部境界を改善 | P01後 |
| [ ] | P07 | 中 | Islandの条件付きmodule読み込み | 独立。Vite／React compatibility検証が必要 |
| [ ] | P08 | 中 | Beautifyの責務と出力整合性を改善 | P05とformatter境界を調整 |
| [ ] | P09 | 中 | Svg／SpriteのIDとsymbol診断 | P02後。source contractを共通化 |
| [ ] | P10 | 低 | Entry参照契約と説明を整理 | P02／P09の出力との組合せも確認 |
| [ ] | P11 | 条件付き | Archiveのstreaming対応 | P03後。大容量benchmarkで必要性を判断 |

### P01: Searchの除外とquery処理

着手日: 2026-09-08。除外判定・語彙整合性・literal query／highlight・初回index取得後の更新と回帰テストを対象とする。P06の辞書最適化・内部境界の分離は含めない。

対象: [HTML analyzer](../../packages/minista/src/adapters/html/node-search-analyzer.js)、[Search UI](../../packages/minista/src/plugins/search/components/search.js)、[Search feature](../../packages/minista/src/features/search/search.js)。

- 親の`querySelector()`の最初の一致との比較をやめ、対象elementとselectorの一致を正しく判定する。
- 除外済みの同じ内容から`words`／`content`／`toc`を作り、除外本文が語彙に残る不一致をなくす。
- UIの入力を直接`RegExp`へ渡す箇所を確認し、通常検索とhighlightはliteral検索として扱う。正規表現検索を公開仕様として残す必要がある場合は、明示optionとエラー処理を別途設計する。
- 初回index取得後に現在の入力で検索が更新されるかも確認し、不足していれば修正する。

完了条件: 同じ親の複数一致・入れ子の除外・除外内の見出しを検証し、語彙／本文／tocが整合する。`C++`や未閉鎖の括弧を含む入力で例外にならず、初回入力の結果がindex取得後に反映される。dev JSONとbuild JSONのsemanticsが一致する。

完了記録（2026-09-08）:

- analyzerはelementの`matches()`で全一致を判定し、一致した子孫を含むsubtreeを読み飛ばす。語彙はtitleと除外後のcontent tokenから生成し、tocも同じcontent位置へ揃えた。共有HTMLは変更しない。
- UIは入力とhighlightの両方をescapeし、literal検索に固定した。入力・index・検索propsの変更で結果を再計算し、取得中の入力変更やクリアも最新状態を反映する。
- unit回帰テストは同じ親の複数一致、入れ子、複合selector、除外内の見出し、target自体の除外、HTML非破壊、記号入力、大小文字、初回取得と取得中の入力変更・クリアを検証する。UIはhook harnessとReactのmarkup出力で検証し、実ブラウザ操作テストは追加していない。
- 実Vite fixtureで、通常のページ表示後のdev JSONとbuild JSONが完全一致し、除外語彙・本文・tocが期待値と一致することを確認した。
- `npm run test:ci`: exit 0、99ファイル・411テストと`tsc --noEmit`が成功。ローカルHTTP listenを許可した環境で実行した。
- `npm run test:cli-contracts`: exit 0、fixtureの`check --json`／`inspect --json`／`build`が成功。生成bundleは型検査対象へ混入するため、検証後にリポジトリ外へ退避した。
- 設計資料・ADR-0015・公開Search docs・migration noteを更新した。`git diff --check`が成功した。
- 残る範囲: token分割と`hit`による検索対象語の選別、JSON schema、公開optionは維持する。辞書高速化と内部query engineの分離はP06で扱う。


### P02: Svgの属性保持とdev更新

対象: [SVG resolver](../../packages/minista/src/adapters/html/node-svg-source.js)、[Svg feature](../../packages/minista/src/features/svg/compose.js)、[公開facade](../../packages/minista/src/plugins/svg/index.js)。

- source contractに描画上必要なルート属性を含め、明示propsとsource属性の優先順位を定義する。markerなど内部属性を無条件にコピーしない。
- ファイル変更をadapterで検出してcacheを無効化する。既存のImage／Spriteのsource→page参照管理を参考にし、Vite処理をCoreへ持ち込まない。
- 欠落sourceを無言でスキップする扱いを再検討し、stable code付き診断と互換性方針を記録する。

完了条件: `fill`／`stroke`／viewBox／明示propsの合成が正しい。dev起動後のSVG変更で再起動なしに表示が更新され、再buildでも古いsourceが残らない。複数serverのcacheが混ざらない。

完了記録（2026-09-08）:

- source contractへ最適化後の描画用ルート属性を追加した。明示propsを優先し、ルートID、イベント属性、任意のdata属性をコピーしないallowlistとした。`style`／`class`は属性単位で上書きする。
- dev adapterがserverごとのsource→page参照を記録し、add／change／unlinkでresolver cacheを無効化して参照ページをreloadする。invalidationと競合する古い読込結果はcacheへ戻さない。buildはbundle開始ごとにcacheをclearする。
- 欠落sourceは`MINISTA_SVG_SOURCE_NOT_FOUND` errorに変更し、project相対locationを付ける。ADR-0004、設計資料、公開Svg docs、migration noteへ互換性方針を記録した。
- unitで属性保持・内部属性除外・明示props優先・path aliasの無効化・欠落診断を検証した。実Vite fixtureでは変更・削除・復旧、対象ページへのreload通知、同一pluginを共有する複数serverの分離、連続buildの更新を検証した。ブラウザの画面操作は行わず、ViteのHTML変換結果と更新通知、build出力を確認した。
- `npm run test:ci`: exit 0、102ファイル・424テストと`tsc --noEmit`が成功。最初のsandbox内実行はローカルHTTP listen拒否で停止したため、listenを許可して全体を再実行した。更新通知の検証を強化した後のSvg integration testも成功した。
- `npm run test:cli-contracts`: exit 0。fixtureの`check --json`／`inspect --json`／`build`が成功。生成bundleは型検査対象に混入しないようリポジトリ外へ退避した。`git diff --check`も成功した。
- 残る範囲: 内部IDの名前空間化とSpriteとの解析共有はP09で扱う。Vite／React／Node.jsの対応範囲と新規Vite API採用には変更がない。

### P03: Archiveの入力解決と欠落診断

着手日: 2026-09-08。入力解決・欠落診断・再build時のarchive除外と回帰検証を対象とする。streaming対応はP11に残す。

対象: [公開facade](../../packages/minista/src/plugins/archive/index.js)、[Node builder](../../packages/minista/src/adapters/archive/node.js)、[公開型](../../packages/minista/src/plugins/archive/types.d.ts)。

- 入力未指定時はadapterが解決済み`build.outDir`を使う。明示した`srcDir`は尊重する。
- 省略可能な設定と解決後の必須設定を型でも分離する。
- source directoryの欠落と存在する空directoryを区別し、欠落はstable code付きerrorにする。空directoryの扱いは仕様として固定する。
- `emptyOutDir:false`や再buildで過去のarchiveが今回のarchiveへ混入しないか確認する。

完了条件: custom outDirと明示srcDirのZIP／TAR内容が正しく、欠落sourceでbuildが失敗する。失敗時のoutput transaction、manifest／claimの整合性が維持される。省略時の変更はmigration noteに記載する。

完了記録（2026-09-08）:

- 公開`srcDir`を省略可能にし、Vite adapterが解決済み`build.outDir`を補完する。明示入力を尊重し、Core feature／Node builderへは必須`srcDir`を持つ解決済みrecipeを渡す。既定出力名`dist`は維持した。
- Node builderは入力をstatで検証し、欠落は`MINISTA_ARCHIVE_SOURCE_NOT_FOUND`、非directoryは`MINISTA_ARCHIVE_SOURCE_NOT_DIRECTORY` errorにする。存在する空directoryは許可し、探索中のENOENT warningは無視せず`MINISTA_ARCHIVE_FAILED`にする。
- 設定された全archive出力パスをglobから除外し、`emptyOutDir:false`の再buildでも前回の同名archiveが混入しない。入力directory名と除外出力名はglobの特殊文字をescapeする。project内のentry prefixを維持し、project外入力はbasenameをprefixとする。claimには解決した入力のproject相対labelを渡す。
- 実Vite fixtureでcustom outDir、明示srcDir、ZIP／TARの収録パスと内容、ignore、特殊文字を含む入力、連続build、既定plugin、project外の絶対outDirを検証した。manifestのarchive ownership・出力との一致と、欠落時の旧HTML・archive・manifest・diagnostics復元も確認した。空directory、非directory診断、公開型の省略許可と内部型の必須入力も回帰テストで固定した。
- 最終`npm run test:ci`: exit 0、104ファイル・432テストと`tsc --noEmit`が成功。sandbox内の初回はHTTP listen制限でdev testが停止したため、listenを許可して再実行した。CLI生成物が型検査に混入した実行もあったため、退避後に全体を通し直した。
- `npm run test:cli-contracts`: exit 0。fixtureの`check --json`／`inspect --json`／`build`が成功。生成bundleはリポジトリ外へ退避した。`git diff --check`も成功した。
- 設計資料・ADR-0004・公開Archive docs・migration noteを更新した。
- 残る範囲: 設定から削除・改名した過去のarchiveと別途配置したZIP／TARは自動除外しないため、必要なら`ignore`で除外する。streamingと大容量memory改善はP11。Vite／React／Node.jsの対応範囲と新規Vite API採用には変更がない。

### P04: 公開型と配布依存

対象: [node.d.ts](../../packages/minista/src/node.d.ts)、[package manifest](../../packages/minista/package.json)、pluginの公開型、型検証設定。

- Island／Beautifyのoption型を隣接`types.d.ts`へ正しく接続する。
- 公開宣言の解決に必要な型依存を公開package側で保証する。root workspaceのhoistingで偶然解決される状態に依存しない。
- MDX由来のJSX namespaceエラーを別問題として切り分け、対応React型と依存型の組合せを検証する。根拠のないglobal JSX追加で隠さない。
- 公開optionとinternal recipe／Graph型の境界も確認する。既存の公開type exportを整理する場合は互換性を維持する。

完了条件: packしたpackageを隔離consumerへ入れ、全10プラグインとcomponentの公開型が`skipLibCheck:false`で解決する。不正なoption値も拒否され、`any`化して通っただけにならない。React／Vite対応範囲に影響する変更はcompatibility gateを通す。

完了記録（2026-09-08）:

- Island／Beautifyのoption型参照を隣接`types.d.ts`へ修正した。`@types/archiver`／`@types/js-beautify`をrootのdevDependenciesからministaのdependenciesへ移し、lockfileも更新した。
- MDXのエラーは`@mdx-js/mdx@3.1.1`のentryから評価用`@types/mdx@2.0.14`を読み込む際のglobal JSX参照と切り分けた。compile optionだけを隣接宣言に定義し、上流とのkey集合・双方向の代入互換性を型テストで固定した。global JSX追加や非公開MDX subpathのimportは行わない。直接参照する`unified`／`remark-rehype`を配布依存に明記した。
- `minista/client`の削除済みMDX宣言への参照を修正し、SSG配下にMD／MDX component宣言を配置した。公開entryのexportとoption shapeを維持し、内部recipe／Graph型を公開optionへ追加していない。既存の補助型exportを削除せず、SSG内部の`PageId`はID宣言から直接参照する。
- `npm run test:public-types`を追加し、通常CIへ組み込んだ。packしたpackageをリポジトリ外の空consumerへそれぞれインストールし、全10プラグイン、全asset component、Head／Context、page型、MD／MDX importを`strict:true`／`skipLibCheck:false`で検証する。不正option／component propsの`@ts-expect-error`も検査し、any化による見かけの成功を防ぐ。
- 最終の配布型検証はexit 0。React 18.3.1＋`@types/react`18.3.31、React 19.2.8＋`@types/react`19.2.18の双方で成功した。Vite 8.2.2、TypeScript 7.0.2、moduleResolutionはBundler。consumerへArchive／Beautify／MDX compilerの型依存を手動追加していない。初回sandbox実行はnpm cache書込みとregistry接続制限があったため、一時cacheとネットワークを許可した実行で確認した。
- `npm run test:ci`: exit 0、104ファイル・432テストと`tsc --noEmit`が成功。ローカルHTTP listenを許可した環境で実行した。`npm run test:cli-contracts`もexit 0でcheck／inspect／buildが成功し、生成bundleは型検査へ混入しないようリポジトリ外へ退避した。
- ADR-0006、architecture、公開migration noteを更新した。React／Vite／Node.jsのpeer・engine対応範囲とruntimeは変更していないため、既存Compatibility CIの手動実行対象となる対応範囲変更はない。
- 残る制限: 上流のMDX評価APIそのもののReact 19型問題を修正するものではない。上流の修正後に直接型importへ戻せるか再検討する。公開宣言のNodeNext対応とTypeScript全versionの検証は今回の対象外。

### P05: 重い依存の遅延ロード

対象: [package entry](../../packages/minista/src/node.js)、Image／SVG／Sprite／Archive adapter、[HTML barrel](../../packages/minista/src/adapters/html/index.js)、[formatter](../../packages/minista/src/features/beautify/format.js)。

- Sharp、SVGO、archiver、js-beautify等を初回の実処理まで読み込まない構造を検討する。MDXの既存遅延compilerを参考にする。
- 公開`pluginXXX()`をPromiseに変えず、adapter内部の非同期処理で初期化する。同時利用は同じ初期化へ合流させる。
- barrel exportやdescriptorのID参照だけで、別featureの重い実装が読み込まれる経路を除く。ArchiveからBeautifyのIDを取るためにformatterを読み込む経路も対象。
- module loadのcacheとbuild／serverごとの可変stateを区別する。

完了条件: `minista`のimportのみ、SSGのみ、各featureの初回利用と再利用をfresh processで検証する。未使用libraryの評価が発生せず、初期化失敗も既存のstructured diagnosticへ接続される。cold import／起動／初回処理の測定条件と結果を`design/benchmarks/`へ記録する。

完了記録（2026-09-08）:

- Sharpのmetadata取得・変換、Svg／Sprite共有のSVGO、archiver、js-beautifyを実処理まで遅延した。loaderは初期化Promise（失敗を含む）だけを共有し、pipeline・archive instance・source cache・server／build stateを共有しない。
- 公開plugin factoryは同期のまま維持した。Beautifyの内部formatterを非同期化し、finalizeがawaitする。対象外のfileではformatterを初期化しない。ArchiveのoptionalAfterはfeature IDを直接生成し、Beautify実装へのimportを除いた。HTML barrelのexportは維持し、参照だけではSVGOを評価しない。
- fresh process回帰テスト12件でpackage import、全plugin factory生成、SSG起動、各featureの初回同時利用・再利用・初期化失敗を確認した。Image／Svg／Sprite／Archiveの既存adapter診断とBeautifyのphase診断を検証した。
- `npm run test:ci`: exit 0、105ファイル・444テストと`tsc --noEmit`が成功。最終版の測定hookと失敗検証を反映した後の対象12テストもexit 0。初回sandbox実行はHTTP listen制限があり、CLI生成物が混入した型検査もあったため、listen許可・生成物退避後に全体を通した。
- `npm run test:cli-contracts`: exit 0。check／inspect／buildが成功し、生成bundleはリポジトリ外へ退避した。`npm run test:public-types`: exit 0、packした配布物をReact 18／19の隔離consumerで検証した。
- [測定条件と結果](../benchmarks/2026-09-08-lazy-dependencies.md)を記録した。ADR-0001とarchitectureを更新した。公開API・出力semantics・Vite／React／Node.jsの対応範囲は変更していない。
- 残る範囲: formatter portと出力整合性はP08。対象外の依存、インストール容量削減、実サイトのHTTP初回応答と変更前baselineの比較は今回の測定に含まない。

遅延ロードはインストール容量を減らさない。optional dependency化や公開package分割は、容量・起動・利用頻度の実測から利益が示された場合の別判断とする。

### P06: Search辞書と内部境界

着手日: 2026-09-08。辞書Map、index生成とReact非依存query engineの内部分離、互換性検証と規模別benchmarkを対象とする。

- 語彙の整列後に`word → index`のMapを一度作り、`indexOf()`の繰返しをなくす。
- analyzer／index生成／query engine／React UIを内部で分ける。必要性が固まるまでは新しい公開APIを増やさない。
- mojigiriは文字種分割を担当する依存として維持する。検索品質の変更と単なる性能改善を分ける。

完了条件: P01後のindex出力順と検索結果を保ち、ページ数・語彙数・総token数を変えたbenchmarkで時間とメモリを比較する。新しい検索libraryの採用は、検索品質や規模の要件が既存構造では満たせない場合に限定する。

完了記録（2026-09-08）:

- index生成を`features/search/create-search-data.js`へ分離し、語彙整列後のMapをhit／title／contentで共有した。既存内部exportは維持する。
- React非依存の`plugins/search/internal/query.js`へ準備・検索・token結合を移し、index取得時の辞書Mapと検索用pageを入力変更時に再利用する。analyzerはDOM解析とmojigiri、featureはArtifact／phase、UIは取得・入力・描画・URL解決を担当する。公開APIと依存は追加していない。
- 新規unitで辞書・hit・URL順、重複token、空index、順位・同点順、本文抜粋の起点、tocリンク、入力option、入力非破壊を固定した。既存P01のliteral検索・初回取得・クリアと実Viteのdev/build JSON一致も成功した。
- 最終`npm run test:ci`: exit 0、107ファイル・446テストと`tsc --noEmit`が成功。初回sandbox実行はHTTP listen制限があり、再実行時に追加テストのtuple型注釈を修正した。最終実行はlisten許可環境で実施した。
- `npm run test:cli-contracts`: exit 0、fixtureのcheck／inspect／buildが成功。`git diff --check`も成功した。
- [規模別benchmark](../benchmarks/2026-09-08-search-dictionary.md)に時間・heap差分・peak RSSと生データを記録した。5条件で変更前後のJSONハッシュが一致した。Mapの追加メモリも記録し、メモリ削減とは扱わない。
- architectureとADR-0015を更新した。公開schema・option・検索品質・Vite／React／Node.js対応範囲は変更していない。query／React／実サイト全体の性能測定とブラウザ操作テストは今回の対象外。

### P07: Islandの条件付きmodule読み込み

対象: [entry生成](../../packages/minista/src/plugins/island/utils/code.js)、[Island feature](../../packages/minista/src/features/island/island.js)、Vite client input／output adapter。

- `visible`／`media`／`idle`では条件成立時にdynamic importする構造を設計する。`load`／`only`の開始タイミングは維持する。
- 共通runtimeを抽出し、dev／buildの重複したdirective処理を減らす。
- 複数instanceの二重hydrateを防ぎ、共有chunk、CSS取得、import失敗の扱いを定義する。
- Viteのpreloadが意図せず遅延moduleを先行取得しないか実際のbrowserで確認する。

完了条件: 条件不成立時に対象snippetが取得・評価されず、成立後は一度だけhydrateされる。CSS、ページ分割、同一componentの複数配置、React 18／19と既存Preact経路を確認する。初期転送量と操作可能になるまでの遅延を測定し、出力claimも更新する。

### P08: Beautifyの責務と出力整合性

対象: [formatter feature](../../packages/minista/src/features/beautify/format.js)、[公開facade](../../packages/minista/src/plugins/beautify/index.js)、SSGのdocument composition。

- js-beautifyをformatter adapterへ閉じ、featureは整形の要求と確定outputを扱う。
- image preloadの方針をSSG側の明示的なdocument出力設定として設計する。現行`removeImagePreload`は移行期間を設け、既定値を黙って変更しない。
- JS／CSS整形の時点とsourcemap・hash・manifestの整合性を検証する。特にJSの`code`だけを変更する処理を解消する。
- 納品用整形と配信容量のtradeoffを公開docsへ記載する。

完了条件: 整形のみの指定で意図しないpreload変更を起こさない。互換設定で従来出力を維持し、sourcemapの対応位置を確認する。整合性を保証できない組合せは明示的なdiagnosticで扱う。責務変更をADRへ記録する。

### P09: Svg／SpriteのIDとsymbol診断

- 元のルート属性を失わない解析・最適化処理を共有する。公開Svg／Sprite APIは分離を維持する。
- duplicate symbolを黙って上書きせず、衝突するsourceを特定できるdiagnosticにする。
- gradient／clipPath等の内部IDに決定的な名前空間を付け、参照も追従させる。既存の公開symbol IDと内部IDを区別する。

完了条件: 異なるSVGの同名内部ID、同じSVGの複数inline配置、複数symbolを扱っても描画と参照が正しい。生成順によらず結果が安定し、dev／buildで一致する。最適化前後の描画を視覚的にも確認する。

### P10: Entry参照契約と説明

対象: [Entry feature](../../packages/minista/src/features/entry/entry.js)、公開docs。

- 収集・解決・書換えの対象属性を一つの明示的な契約へ揃える。`content`や`poster`を無条件にassetとみなさず、対象element／値の条件を定義する。
- public asset、外部URL、query／fragment、srcset、baseを扱う既存semanticsを固定する。
- SSGのmodule import由来assetとEntryのHTML参照由来assetの違いを具体例で説明する。

完了条件: 収集対象だけを適切に書き換え、共有CSSを重複挿入せず、SSG／Image／Svg／Sprite／Islandと併用したfixtureで出力とclaimが一致する。走査最適化は結果を固定した後に測定する。

### P11: Archiveの大容量対応

- 現在の全chunk収集、`Buffer.concat()`、Emitterへのbinary格納・copyによるpeak memoryを測定する。
- 大容量の配布物で問題が示された場合に、file-backed artifactまたはstream対応の明示portを設計する。
- streamや一時fileを新しいfeature間の非公開protocolとして導入しない。所有権、cleanup、transactionをADRで定義する。

完了条件: 同じ入力でarchive内容を維持しながらpeak memoryの改善を測定できる。成功・失敗・rollbackで中間出力が適切に処理され、公開manifestへprivate pathが漏れない。必要性が示されなければ測定結果と保留理由を残す。

## 依存選定と共通設計の方針

- Sharp、SVGO、MDX compiler、archiver、js-beautifyを、依存数だけを理由に自作へ置き換えない。
- tinyglobbyは探索、picomatchはpattern判定として用途を区別する。類似する名前だけで重複と判断しない。
- YAML／TOML parserとMDX frontmatter構文・ESTree生成は別の責務。対応形式を維持する範囲で依存を評価する。
- Vite／React peer rangeは既存compatibility方針を維持し、この計画だけを理由に変更しない。
- capabilityと`requires`／`after`／`optionalAfter`による順序管理を維持する。Artifactが必要になるphaseを具体化し、HTML markerやplugin配列順の新しい暗黙依存を追加しない。
- 全feature共通phase loop、Coreのpackage分割、fallback廃止は今回の前提作業にしない。既存roadmapの独立した候補として扱う。

## 検証と記録

各実装変更では対象の回帰テストと、少なくとも次を実行する。

```sh
npm run test:ci
```

CLI／buildに関係する変更は隔離したfixtureで次を確認する。既存fixture向けのまとめたscriptは`npm run test:cli-contracts`。

```sh
minista check --json
minista inspect --json
minista build
```

Vite／React／Node.jsの対応範囲へ影響する変更では、対象のcompatibility scriptをローカル実行し、GitHub Actionsの`Compatibility CI`を対象suiteまたは`all`で手動実行する。実際のscriptとsuite名は[package.json](../../package.json)と[workflow](../../.github/workflows/compatibility.yml)で確認する。

レビュー時の検証記録:

- 既存testは初回393件成功。ローカルHTTP listenがsandboxで拒否された2ファイルをsandbox外で再実行し、残り7件も成功した。合計400件成功。
- 上記の初回`test:ci`はtest段階で停止したため、後続typecheckまで成功した実行ではない。
- 公開宣言の追加検査は`tsc --ignoreConfig --noEmit --skipLibCheck false --strict --moduleResolution bundler --module esnext --target es2022 --types react,node packages/minista/src/node.d.ts`で実施し、P04のエラーを確認した。
- 小さな再現実行と参考測定はレビュー時の観測であり、実装変更の検証結果として流用しない。

計画文書の追加時の検証（2026-09-08）:

- `npm run test:ci`: exit 0。98ファイル・400テストと通常の`tsc --noEmit`が成功した。ローカルHTTP listenを許可した環境で実行した。
- 通常のtypecheckは`skipLibCheck:true`のため、P04の厳格な公開宣言検査とは保証範囲が異なる。
- 変更した3文書のローカルリンクの参照先を確認し、欠落なし。`git diff --check`も成功した。

## 別チャットで再開する際の手順

1. repositoryの`AGENTS.md`、`design/README.md`、この計画と対象ADRを読む。
2. `git status`と最新実装を確認し、対象IDの問題が未解決であることを確かめる。
3. 最初の修正群はP01〜P04。原則として1項目ずつ、再現・修正・検証・文書更新を完結させる。
4. 着手時に対象IDと範囲を記録する。完了時にチェック、変更内容、検証結果、残る制限を更新する。
5. 未実装の計画はこの文書とroadmapに残し、`architecture.md`のCurrentには完了した事実だけを反映する。

## 外部の判断材料

2026-09-08のレビューで参照。実装時のAPI採用判断では最新の公式仕様を再確認する。

- [Sharp](https://sharp.pixelplumbing.com/): 画像形式、resize、stream／buffer／filesystem入出力
- [MDX compiler](https://mdxjs.com/packages/mdx/): compilerとprocessorの公開API
- [Archiver](https://www.archiverjs.com/): ZIP／TAR生成とstreaming
- [TypeScript declaration publishing](https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html): 公開宣言が要求する依存の配置
- [SVGO prefixIds](https://svgo.dev/docs/plugins/prefixIds/): inline SVGのID衝突と再現可能なprefix
- [mojigiri](https://github.com/qrac/mojigiri): 文字種に基づく日本語分割
- [React hydrateRoot](https://react.dev/reference/react-dom/client/hydrateRoot): server／client出力の一致とhydration契約
