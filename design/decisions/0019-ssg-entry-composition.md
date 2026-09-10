# ADR-0019: HTML参照Entryの公開APIをSSGへ統合する

- Status: Accepted
- Date: 2026-09-10
- Amends: [ADR-0004](0004-plugin-api-compatibility.md)、[ADR-0013](0013-ssg-page-formats-and-render-assets.md)

## Context

EntryはSSGのRenderedPageを前提にclient inputを収集し、Vite出力へHTMLを書き換える。公開optionは空で、独立した`pluginEntry()`を指定する必要性がない。一方、EntryをSSGのgenerateBundleへ直結すると、Comment／Svgの後、Search／Beautifyの前という依存順と`feature:entry`の出力所有権を壊す。

## Decision

`pluginEntry()`のruntime export、公開型、公開pluginディレクトリを削除し、`pluginSsg()`をSSG・Entryの内部Viteプラグインを返すcomposition rootにする。Viteの既存PluginOption配列処理を使い、利用者の設定は`plugins: [pluginSsg()]`とする。戻り値の型は`Plugin[]`。新しいoption、無効化flag、deprecated aliasは設けない。

- `features/entry`のanalyze／bundle／compose、descriptor、Artifact schemaを維持する
- Vite連携は`adapters/vite/ssg-entry.js`へ分離し、SSG本体へHTML解析やbundle出力照合を詰め込まない
- App Buildは`html-documents`のrequiresによりSSGのprepareClientの後にEntryを準備する。Comment／SvgのoptionalAfterと後続featureの依存も既存schedulerで解決する
- SSGのenvironment別RenderedPage snapshotを明示callbackで渡す。Entry専用のArtifact／外部JSON読戻しは行わない
- Legacy／外部CLIのclient configはSSGがrender後にEntry準備を直接awaitし、得られたinputを返す。別々のconfig hook順への依存を除く
- Entryは参照Artifactを準備時に一度生成し、client build後はそのArtifactを明示inputとしてbundle／composeへ渡す。composeはComment／Svgなどが変更した現在のDocumentへ適用する
- bundle phaseは参照Artifactを再利用するときにGraph上の参照nodeも復元し、bundle planの依存edgeを維持する
- client input、参照Artifact、出力claimをenvironment単位に分離し、prepare時に再作成する。ownerは`feature:entry`を維持する

HTML参照の対象要素・属性、base、query／fragment、ページ別imported CSS、publicのみの参照を未変更にする契約はADR-0004のP10を維持する。project rootとpublicの同名pathは従来どおりrootが優先される。通常のbuild回数、Vite／React／Node.js対応range、採用API、fallback条件は変更しない。

## Consequences

- v5利用者はimportとplugins配列から`pluginEntry`を削除する。starter、docs、playground、fixtureも同時に更新する
- `pluginSsg()`の戻り値を直接introspectするコードは配列へ対応する必要がある。通常のVite設定は変更不要
- 内部Featureの分離、出力ownership、順序独立性を維持し、Entry参照の再解析とsnapshotの読戻しを減らす
- `public`のCSS・JSとHTML参照のsource entryは同じページで併用できる

## Rejected alternatives

### Entry処理をSSGのoutput hookへ直接追加する

SSG→Comment／Svg→Entryという順序を表現できなくなる。内部Featureを別participantとして残す。

### 単一Pluginのために複数Feature用の独自metadata protocolを追加する

既存Viteのplugin配列とschedulerで構成できるため、新しい展開・dispatch・claim収集の仕組みを追加しない。

### pluginEntryを互換aliasとして残す

v5でBundle／MDXを統合した方針に合わせる。aliasの併用は二重登録や重複実行への対策を要し、設定を単純化する目的に反する。

## Validation

公開runtime／型の削除、SSG単独でのCSS・JS／public併用、参照解析の一度だけの実行、再build、複数environment、既存のbase別参照・出力claim・plugin順序・App／Legacy／外部CLI契約を検証する。

## 併用検証で修正した出力不整合

ViteがJS由来のCSSへ同じoriginalFileNamesを付ける場合、Entryの出力照合がJS chunkをCSS assetで上書きしていた。実行chunkを優先し、imported CSSはそのchunkのmetadataから挿入する。またrender buildのcopyPublicDirをfalseに固定し、Legacyのrender asset復元へpublic CSSが混入して全ページへ重複挿入されるのを防ぐ。publicのコピーはclient buildが所有する。
