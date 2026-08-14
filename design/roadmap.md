# v5 roadmap

最終確認日: 2026-08-14

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

全公開pluginにmachine-readable feature metadataを追加しました。SSG、Comment、Svg、Beautify、Archive、Search、Sprite、Image、Entry、Bundle、IslandをCore lifecycleへ接続し、MDXはcompiler adapterとしてVite境界に残しました。productionとdevは同じdomain featureを使用します。

完了条件: featureがrendered page dataを実行可能temp moduleからimportせず、依存、capability、Artifact ownership、phaseを明示する。

## Stage 5: Vite app build adapter

進捗: 完了。

通常buildは`ViteAppBuilderAdapter`が一つの`createBuilder()`からrender、client、compose、emitを実行します。environment間のplugin構成差はprogrammatic legacy adapter、programmatic configへ安全に変換できないCLI flagだけは外部Vite CLIへfallbackします。fallbackの発動条件と削除条件は [`vite.md`](vite.md#retained-compatibility-fallbacks) に固定しています。

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

## Experimental tracks

以下はStage 8の未完了項目ではなく、上流APIの安定化後に個別判断する将来候補です。

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
| Image buildの性能低下 | [v4.0.8比較](benchmarks/v4-v5-2026-08-14.md)をbaselineにphase別計測し、画像変換とcompatibility lifecycleのコストを分離 |
