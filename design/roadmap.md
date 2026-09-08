# v5 roadmap

生成workspaceの`.minista`表記は、rootにpackage.jsonがある場合は`<root>/node_modules/.minista`、ない場合は`<root>/.minista`を指します（[ADR-0016](decisions/0016-workspace-and-agent-guide.md)）。

最終確認日: 2026-09-05

v5のStage 0〜8は完了しました。この文書は各Stageの完了状態と、v5の完了後も独立して追跡するexperimental項目を記録します。実装済みの詳細は [`release-notes-v5.md`](release-notes-v5.md)、現在の構造は [`architecture.md`](architecture.md)、Vite境界とfallback条件は [`vite.md`](vite.md) を参照してください。

## Guiding constraints

- 公開plugin APIと内部feature contractを分離する
- Coreとgraph schemaをViteの変更から隔離する
- feature間の受け渡しにはProject Graph、Artifact Store、明示phaseを使う
- manifest schemaをinternal typeより小さく保ち、秘密情報とarbitrary propsを含めない
- 通常の開発、CLI、testに事前buildを要求しない

## Stage 0: baselineを固定する

進捗: 完了。

代表fixtureでSSG、Head、Image、Entry、Island、SearchのHTML、asset、failureを固定しました。全公開pluginのruntime export、feature metadata、公開option type、build／dev compatibility経路をtestで検証します。

完了条件: compatibility suiteが公開出力と主要failureを再現し、内部変更との差分をレビューできる。

## Stage 1: Core skeletonとJavaScript + JSDoc移行

進捗: 完了。

diagnostics、graph、lifecycle scheduler／runner、Artifact Store、Emitter、manifest、query service、portをJavaScript + JSDocで実装しました。必要なpublic typeは隣接`.d.ts`に分離し、package entry、CLI、testは`src/`を直接参照します。

完了条件: Vite、React、filesystemをimportしないCore testと型検査が事前buildなしで通り、runtime implementationに`.ts`が残らない。

## Stage 2: discovery／route／page graph

進捗: 完了。

route discovery、param parser、PageNode resolution、`getStaticData()`診断、ModuleEvaluator portを実装しました。`check`、`inspect`、`explain`はVite ModuleRunner adapterを通じて実際のpage moduleを評価します。

完了条件: 全pageがProject Graphから列挙され、URL、draft、重複route、missing paramの挙動をfixtureで確認できる。

## Stage 3: rendererとdocument composition

進捗: 完了。

交換可能な`StaticRenderer` port、React 19の`prerenderToNodeStream()` adapter、Preact／React 18向けcompatibility rendererを実装しました。`HtmlDocument`、`HtmlDocumentStore`、node-html-parser adapterにより、featureはparser非依存のDocumentを共有します。

完了条件: Headを含むpage treeを1回だけrenderし、Suspense、`useId`、preload、doctype、Preact alias、render errorを互換fixtureで検証できる。

## Stage 4: featureを明示phaseへ移す

進捗: 完了。

全公開pluginにmachine-readable feature metadataを追加しました。SSG、Comment、Svg、Beautify、Archive、Search、Sprite、Image、Entry、IslandをCore lifecycleへ接続しました。BundleとMDXの公開設定はSSGへ統合し、MDX compiler adapterはVite境界に置いています。productionとdevは同じdomain featureを使用します。

完了条件: featureがrendered page dataを実行可能temp moduleからimportせず、依存、capability、Artifact ownership、phaseを明示する。

## Stage 5: Vite app build adapter

進捗: 完了。

通常buildは`ViteAppBuilderAdapter`が一つの`createBuilder()`からrender、client、compose、emitを実行します。isSsrBuildを参照するconfigとenvironment間のplugin構成差はprogrammatic legacy adapter、programmatic configへ安全に変換できないCLI flagだけは外部Vite CLIへfallbackします。fallbackの発動条件と削除条件は [`vite.md`](vite.md#retained-compatibility-fallbacks) に固定しています。

`--oneBuild`は削除し、指定時は`MINISTA_CLI_OPTION_REMOVED`を返します。programmatic buildはoutDir transactionを使用し、失敗時に以前の正常な出力へrollbackします。

完了条件: 通常の`minista build`がVite CLIを二回spawnせず、一つのresult、diagnostic collection、build sessionで完結する。

## Stage 6: ModuleRunner dev adapter

進捗: 完了。

`ViteDevServerAdapter`がprogrammatic custom serverを所有し、`ViteDevModuleEvaluator`がModuleRunnerをCore portへ適合させます。route／render cache、module dependencyからRouteNodeへの投影、URL単位reload、Sprite／Image Artifactのtargeted reloadを実装しました。

HTTP、module評価、watch／HMR、Vite URL解決はadapterに残し、HTML、Artifact、render、検索dataはCore featureが所有します。責務表は [`vite.md`](vite.md#dev-adapter-ownership) を参照してください。

完了条件: build用render bundleなしでdev renderingが動作し、page、layout、static data、参照assetの変更が対応するgraph nodeをinvalidationする。

## Stage 7: manifest／inspect／explain

進捗: 完了。

Project Manifest schema v1、diagnostics snapshot、atomic writer、migration registry、output claim protocolを実装しました。通常buildと両fallbackが`.minista/manifest.json`と`.minista/diagnostics.json`を生成します。`inspect --manifest`とinternal query boundaryはVite serverやuser moduleを起動せず、安全なread modelだけを扱います。

完了条件: source全体を解析しなくてもroute、page、generated asset、outputの関係をJSONから追える。

## Stage 8: compatibility facade cleanup

進捗: 完了。

- runtime implementationをJavaScript + JSDocへ統一し、public typeを隣接`.d.ts`へ分離
- production／devの全domain featureをCore lifecycleの明示phaseへ接続
- build sessionとdev server sessionでDocument、Graph、Artifact、Emitter、diagnostics、traceを共有
- page scope付きArtifactと入力Document限定phaseにより、devの集約出力をincrementalに再生成
- executable temp module handoffと旧`SsgPage`型を削除し、`RenderedPage`とschema付きJSONへ統一
- Vite／filesystem／parser／画像／archive errorをstable code付きstructured diagnosticへ正規化
- programmatic／外部CLI fallbackを2つの明示的な互換経路に限定し、発動条件と削除条件を文書化
- 公開CLI、Config、Migration、package README、plugin個別docsをv5 lifecycleとcommandへ更新
- `architecture.md`の旧TargetをCurrentへ統合し、完了済みの移行記録をrelease notesへ移動

完了条件: compatibility facadeが公開APIとVite hookへの適合だけを担当し、domain処理、状態共有、feature順序、diagnosticsがCore contractで説明できる。

## レビュー後の中核強化

進捗: 完了。判断は[ADR-0015](decisions/0015-application-lifecycle-and-output-transaction.md)を参照してください。

全descriptorを検証してdomain operationを依存順にdispatchし、devの共有mutationをserver単位で直列化します。App Build前後hook、同名pluginのSSR設定、emptyOutDirの保持、metadata失敗時のrollback、error diagnosticによるphase停止、同一processの再buildを回帰テストに追加しました。

追加の中核強化としてGraphのpattern／URL indexと軽量queryを実装し、1,000／10,000ページの構築benchmarkを記録しました。Page／Route削除は関連nodeのPage参照とpage scope Artifactも除去します。domain featureと公開facadeは同じdescriptor生成元を使用します。PRの全test／typecheck、Vite 8.1.0／lockfile版／対応minor最新、React 18、PreactのCI gateはNode.js 22.12で実行し、Node.js 20.19は独立したCLI互換jobで検証します。Vite 8.0.0は実contractでlate client inputが欠落したためpeer rangeから除外しました。

## 今後の移行候補

### プラグインの設計・機能・依存改善

進捗: 計画を文書化済み、実装は未着手（2026-09-08）。詳細と進捗は[改善計画](reviews/2026-09-08-plugin-improvement-plan.md)を参照する。

Search／Svg／Archiveの出力不整合と公開型の配布契約を先に修正し、重い依存の遅延ロード、Search／Islandの性能、Beautifyの責務分離へ進む。公開10プラグインの分割とSSGへのMDX／render asset統合は維持する。各作業の根拠、依存、互換性方針、検証条件は計画に記録する。

### 中核の移行候補

- feature内のscope付きphase bridgeを全feature共通のphase loopへ移す。必要なArtifactとcapabilityを定義してから進める
- crash recovery、同時build、generation単位でのdist／metadata公開。現在の捕捉可能な失敗に対するrollbackとは別の保証として設計する
- config再評価、Document処理、Artifact Storeのbinary copy costを個別に測定する

## Experimental tracks

以下は上記の実装移行とは別に、上流APIの安定化などの条件で個別判断する将来候補です。

### Bundled Dev

- user opt-inの`experimental.bundledDev: true`をclient environmentへだけ渡す
- Coreはbundled／unbundledを知らず、Vite adapterのcapabilityとして扱う
- third-party plugin、virtual entry、Island HMR、custom HTML transformを重点検証する

default化条件: Viteがstableと宣言し、主要fixtureとthird-party plugin matrixが通常devと同じcontractを満たすこと。

### shared plugins／shared config build

`builder.sharedPlugins`／`sharedConfigBuild`は使用しません。phase間共有はProject GraphとArtifact Storeの明示protocolで行います。Viteがstable化し、process内cacheが実測で必要になった場合だけadapter optimizationとして再検討します。

### MCP

v5初期要件には含めません。CLI／JSONと同じread-only query serviceが安定し、manifest schema v1を少なくとも一つのminor release維持した後に検討します。

## Risk register

| Risk | Mitigation |
| --- | --- |
| Vite RC／experimental APIの破壊的変更 | adapter隔離、minor matrix、明示条件付きfallback、CoreにVite typeを入れない |
| HeadとReact static APIの一回render semantics | renderer contractと専用fixture |
| plugin outputの順序差 | golden integration outputとphase dependencyの明文化 |
| manifestにuser data／絶対pathが漏れる | allowlist serializerとredaction test |
| graphが巨大化する | read model分割、ID reference、inspect projection |
| compatibility fallbackの長期残存 | 2経路以外の追加を禁止し、`vite.md`の削除条件で再評価 |
| Image buildの性能回帰 | remote source cacheとbounded concurrencyで対処済み。[v4.0.8比較](benchmarks/v4-v5-2026-08-14.md)と制御測定をbaselineに継続監視 |
