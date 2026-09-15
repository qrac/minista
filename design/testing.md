# テストとCIの検証構成

2026-09-15整理。判断基準は[AGENTS.md](../AGENTS.md)の「このテストを追加しなかった場合、どの現実的な不具合を見逃すか」。通常実行から除外する場合も同じ基準を使う。テスト件数やカバレッジは維持目標にしない。

## 1. 通常実行

`npm test`と`npm run test:w`は`vitest.config.ts`の明示的な対象directoryだけを収集する。事前build、application起動、HTTP listen、CLI子process、全playground buildは含めない。変更時には全unitの実行も必須にせず、例えば`npm test -- packages/minista/test/unit/core/graph.test.ts`のように絞る。

| 対象（`packages/minista/test/`相対） | 残す保証 |
| --- | --- |
| `unit/core/` | Graph更新と参照除去、capability順序・循環検知、Artifact衝突、manifestの公開範囲、structured diagnostic |
| `unit/features/` | route展開、HTML／asset合成、検索indexと代表的な分割例、page単位cacheの無効化、Islandの起動条件 |
| `unit/adapters/` | Vite option／environmentの投影、state分離、失敗時rollback、診断変換、局所的なファイル操作・renderer／MDX／SVG処理 |
| `unit/plugins/`、`unit/public-api.test.js`、`unit/internal-query.test.js` | 公開option・descriptorへの変換、検索UIの非同期状態、query入口の入力拒否 |
| `shared/` | path／URL／file名の正規化、設定merge、assetの判定 |
| `cli/` | 引数とconfig探索、programmatic／fallbackの選択、診断の生成・表示 |
| `plugins/` | 画像寸法・breakpoint、Headの重複排除、Layout／Head合成とimage preload方針 |

adapter名の`compatibility`やテストの由来だけで除外しない。注入したportを使うlifecycle検証は、実際のVite buildなしで順序・state・診断の不具合を検知する。小さなMarkdown／SVG入力や一時ファイルの検証も局所的な範囲で残す。実Sharp変換と繰り返しarchive圧縮はintegrationへ移した。

## 2. 必要時実行

`vitest.integration.config.ts`は`integration/`、`vitest.regression.config.ts`は`regression/`だけを収集する。通常設定へ統合しない。既存fixtureと再現ケースは、下記の不具合を確認する価値があるため保持する。

| 対象 | 通常実行から外す理由／必要時に確認する不具合 |
| --- | --- |
| `integration/application-contract`、`compat-app-build`、`compat-build`、`ssg-app-build`、`vite-app-builder` | Vite実buildを伴う。late input欠落、feature間の受け渡し、hook順序、再build時のstale結果、出力rollbackの破損 |
| `integration/preact-app-build`、`plugin-mismatch-build`、`external-cli-build` | 代替runtimeやfallback経路。Preact alias混入、fallback選択、外部processのhandoff／metadata昇格の破損 |
| `integration/dev-server`、`dev-styles`、`svg-dev` | server／HTTP／watch待機を伴う。CSS配信、HMR、source追加削除、server間state分離の不具合 |
| `integration/ssg-entry`、`entry-references`、`ssg-preload`、`island-lazy`、`search-indexes` | dev／buildやbundleを使った参照解決、base URL、preload、遅延chunk、複数検索indexの結合確認 |
| `integration/beautify-output`、`archive-app-build` | 実build・圧縮・展開commandを伴う。hash／参照／sourcemapの不整合、archiveへの自己混入や破損 |
| `integration/project-commands`、`agents`、`cli-diagnostic` | CLI子processとfixtureを使う。終了code、JSON／stderr、config衝突・削除option拒否、agent入口の配布契約 |
| `integration/lazy-dependencies` | fresh processを繰り返し起動する。重い依存の先行読込、初期化失敗時の診断欠落 |
| `integration/node-image-generator` | 実Sharp変換とcache fixture。画像cacheのstale出力、remote cacheの再取得／秘匿化、画像失敗の診断欠落 |
| `integration/node-archive-builder` | 実圧縮・stream・繰り返し出力。publication失敗でのstaging残留、旧出力破損、出力先への自己混入 |
| `regression/search-tokenize` | 旧mojigiri実装との全UTF-16・疑似乱数比較。通常は代表例で確認し、tokenizer変更時に境界文字・連続呼出しの互換性を追う |
| `public-types/` | 型テスト。実行時assertionとしての重複追加は行わず、型変更時にsource-level型チェックまたは隔離consumerを選ぶ |

上表のテスト名は拡張子`.test.js`を省略している。

### コマンド

```sh
# 関係するintegrationだけ（この例はSSGのEntry処理）
npm run test:integration -- packages/minista/test/integration/ssg-entry.test.js

# tokenizer変更時の旧実装との比較
npm run test:regression -- search-tokenize

# Viteの実build契約／Preact／Node.jsのCLI契約
npm run test:contracts
npm run test:preact
npm run test:cli-contracts

# 型変更時。配布型の検査はpackと外部依存インストールを伴う
npm run typecheck
npm run test:public-types
```

`test:contracts`は既存の5つのVite application contract fileを対象にする。Coreの`project-manifest`は通常unitで検証し、このscriptでは重複実行しない。`test:integration`／`test:regression`を引数なしで実行すると各分類全体を実行するため、その必要がある場合に限る。

### PlaygroundとCI

- `npm run play:<feature>`／`npm run play-build:<feature>`は、変更した機能の動作確認にだけ使う。既定playgroundは`npm run play`／`npm run play-build`。
- `all-play-build`は明示的に全playground確認が必要な場合の補助として残す。通常testや他の検証scriptから呼ばない。FetchはGitHub API、Imageは外部画像への通信があるため、通常の検証へ混ぜない。
- `.github/workflows/ci.yml`と`test:ci`は削除。PR／push時の通常テストCIはない。
- `.github/workflows/compatibility.yml`は`workflow_dispatch`専用のまま維持。必要な`vite`または`node-20` suiteを選ぶ。`all`は両方が必要な場合だけ使う。
- `.github/workflows/gh-pages.yml`はデプロイ用途であり変更しない。

## 3. 削除したテスト

| 旧対象 | 判断 |
| --- | --- |
| `integration/preact-build.test.js` | 同じfixtureのHTMLとIsland JS出力assertionは`preact-app-build`に包含される。後者はlegacy選択とasset出力も確認する。CLIのprocess起動は別のCLI検証で扱い、同じPreact buildと共有fixture清掃を重複維持しない |
| `integration/package-metadata.test.js` | peer rangeの固定文字列とtoolchain／engine文字列の一致だけでは、対応versionで実際に動くかを保証できない。意図的な依存更新にも追従修正が必要になる。互換性の根拠は必要時の実contract検証に置き、配布metadataは変更時に差分を確認する |

`public-api.test.js`はbuildを伴わないためintegrationからunitへ移動した。`cli/diagnostic.test.js`は診断生成・表示のunitを残し、既存のprocess実行2ケースだけを`integration/cli-diagnostic.test.js`へ分離した。新しい検証用テストは追加していない。
