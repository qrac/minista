# v5 roadmap

最終確認日: 2026-08-12

この文書には未実装の計画、上流待ち、experimental 機能、移行完了条件を記載します。各段階は小さく merge 可能にし、公開 API と出力互換性を fixture で固定してから内部を差し替えます。

## Guiding constraints

- 一度に全 plugin を書き換えない
- 現行 build と v5 lifecycle を fixture ごとに比較できる期間を持つ
- public facade と internal feature contract を同じ commit で切り替えない
- Vite experimental API が変わっても Core / graph schema を変更せず adapter だけで追従できる状態を保つ
- manifest schema は code internal type より小さく、秘密情報と arbitrary props を含めない

## Stage 0: baseline を固定する

最初に実装すべき段階です。

- playground から代表 fixture を選び `test/fixtures` に固定する
- current build の HTML、asset、island、image、search output を golden data として記録する
- `pluginXXX()` の export / option type / default を type test にする
- 二回 build と dev request の integration harness を追加する
- current `.minista` producer / consumer を test 名と matrix に明記する
- build failure、dynamic route param 不足、重複 route の現状挙動を記録する

完了条件: 内部変更なしでも compatibility suite が current output を再現し、差分をレビューできる。

## Stage 1: TypeScript Core skeleton

- `core/diagnostics`, `core/graph`, `core/lifecycle`, `core/artifacts` を TypeScript で追加
- branded ID、ProjectPath、JsonValue、Diagnostic、phase event を実装
- graph invariant と phase scheduler の pure unit test を追加
- `MemoryArtifactStore` と test 用 `MemoryEmitter` を先に作る
- 実装から declaration を生成する package build 方針を確立

この段階では現行 plugin の output を変更しません。Core を side-by-side で構築します。

完了条件: Vite / React / filesystem を import しない Core unit test が通る。

## Stage 2: discovery / route / page graph

- SSG の glob code generation を route discovery service へ移す
- route pattern parser と param validation を pure function 化
- `getStaticData` の実行を `ModuleEvaluator` port へ分離
- RouteNode と PageNode を生成し、現行 `SsgPage` へ compatibility projection する
- `minista check` と `check --json` を discovery / resolve 範囲で追加
- duplicate route、missing param、invalid static data を structured diagnostic 化

完了条件: current renderer を使ったまま、全 page が graph から列挙される。現行 URL と draft 挙動が fixture で一致する。

## Stage 3: renderer と document composition

- `StaticRenderer` port を追加し、まず current `renderToString` adapter を移設
- Head / html / body attribute の compatibility test を拡充
- React 19 の `prerenderToNodeStream` adapter を追加
- Suspense、error、preload、doctype、`useId`、Preact alias の差分を fixture で検証
- feature marker と graph node ID を対応させる `HtmlDocument` abstraction を追加

default renderer の切替条件:

1. React 19 fixture の output が互換 policy 内である
2. `Head` の一回 render semantics が維持される
3. Preact alias 使用時は current fallback が明示される
4. stream error が `MINISTA_RENDER_FAILED` に変換される

React 公式は Node.js では Web Stream 版 `prerender()` より `prerenderToNodeStream()` を推奨しているため、Node adapter は後者を第一候補にします。API 名を `ReactSsrRenderer` にはせず、SSG の実態に合わせ `ReactStaticRenderer` とします。

## Stage 4: feature を明示 phase へ移す

移行順は dependency が少ないものから進めます。

1. Comment / Svg: compose phase
2. Beautify / Archive: finalize phase
3. Search: analyze + generate
4. Sprite / Image: analyze + generate + compose
5. Entry / Bundle: analyze + bundle + compose
6. Island: source transform + analyze + generate + bundle + compose

各 feature で行うこと:

- current option をそのまま受ける public facade を維持
- closure state を phase context / graph node へ移す
- `.minista/ssg/*.mjs` の読込を削除
- HTML の再parseを一つの document composition pipeline に統合
- capability と artifact ownership を宣言
- current output 比較 test と feature unit test を追加

完了条件: SSG 以外の feature が `SsgPage[]` temp module を import しない。

## Stage 5: Vite app build adapter

- CLI を `spawn("vite")` 二回から programmatic Minista application runner へ変更
- Vite config に `render` / `client` environment を構成
- `createBuilder()` + `buildApp()` で一つの lifecycle を開始
- render environment を先に build し、native import で build-time module を評価
- graph / generated entry plan を明示 ArtifactStore に保存
- client environment は安定した virtual entry を input とし、graph plan から island / asset entry を解決
- output manifest を Core の compose / emit へ返す
- failure 時の buildId cleanup と partial output policy を追加
- `--oneBuild` に deprecation diagnostic を出す

Environment API は RC、`createBuilder` / `buildApp` hook は Vite 8.2.1 の型上 experimental です。そのため adapter の compatibility test と Vite minor pinning policy を設け、旧二回 build を一つの minor release の fallback として残してから削除します。

完了条件: `minista build` が Vite CLI を二回 spawn せず、render → client → compose → emit を一つの result / diagnostic collection で返す。

## Stage 6: ModuleRunner dev adapter

- dev CLI を programmatic `createServer({ appType: "custom" })` に移す
- `render` environment の `RunnableDevEnvironment.runner.import()` で page module を評価
- request ごとに全 pages を再評価せず、route / module dependency 単位で cache
- environment ごとの module graph と `hotUpdate` を使用
- source change → affected route/page/artifact edge を graph で説明可能にする
- HMR 不能な document change のみ明示的 full reload にする
- `server.ssrLoadModule`, mixed `server.moduleGraph`, `server.ws` 直接利用を adapter から削除

完了条件: build 用 render bundle を生成せずに dev rendering が動作し、page/layout/static data の変更が該当 graph node を invalidation する。

## Stage 7: manifest / inspect / explain

- `.minista/manifest.json` schema v1 と atomic writer を実装
- absolute path / arbitrary props / secret-like config の redaction test を追加
- `inspect`, `inspect --json`, `explain` を Core query service 上に実装
- JSON stdout と log stderr を分離
- manifest migration / unsupported version diagnostic を実装
- 将来の `@minista/mcp` が使用できる read-only query API を internal package boundary として整理

完了条件: source 全体を解析しなくても route → page → generated asset → output の関係を JSON から追える。

## Stage 8: compatibility facade cleanup

- すべての source implementation を `.ts` / `.tsx` に移行
- hand-written `.d.ts` を declaration output に置換
- old `src/plugins` implementation、`--oneBuild`、executable temp module を削除
- public docs を v5 lifecycle と command に更新
- `architecture.md` の Target を Current に統合
- roadmap から完了済みの詳細を release note / ADR へ移す

## Experimental tracks

### Bundled Dev

stable dev path の完了後に別 matrix で試します。

- user opt-in の `experimental.bundledDev: true` を client environment へだけ渡す
- Core は bundled / unbundled を知らず、Vite adapter の capability として扱う
- render environment は初期状態で `isBundled: false`
- third-party plugin、virtual entry、Island HMR、custom HTML transform を重点検証

default 化条件: Vite が stable と宣言し、主要 fixture と third-party plugin matrix が通常 dev と同じ contract を満たすこと。

### shared plugins / shared config build

`builder.sharedPlugins` / `sharedConfigBuild` は初期実装では使用しません。phase 間共有は Project Graph / ArtifactStore の明示 protocol で行います。Vite が stable 化し、process 内 cache が実測で必要になった場合だけ adapter optimization として再検討します。

### MCP

v5 初期要件ではありません。CLI / JSON と同じ read-only query service が安定し、manifest schema v1 を少なくとも一つの minor release 維持した後に検討します。

## Risk register

| Risk | Mitigation |
| --- | --- |
| Vite RC / experimental API の破壊的変更 | adapter 隔離、minor matrix、fallback lifecycle、Core に Vite type を入れない |
| Head と React static API の一回 render semantics | renderer contract、専用 fixture、default 切替 gate |
| plugin output の微妙な順序差 | golden integration output と phase dependency の明文化 |
| manifest に user data / absolute path が漏れる | allowlist serializer と redaction test |
| graph が巨大化する | read model 分割、ID reference、inspect projection、content hash cache は後段 |
| dual implementation 期間の保守負担 | feature 単位の短い移行、compatibility projection、削除条件を各 stage に設定 |

## First implementation step

最初の code change は Stage 0 の compatibility harness です。特に `pluginSsg + pluginImage + pluginIsland + pluginEntry + pluginSearch` を含む fixture で、現行二回 build の output と `.minista` handoff を固定します。これがないまま Core skeleton から始めると、「内部改善」と「利用者から見た破壊」を区別できません。
