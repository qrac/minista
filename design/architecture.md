# Architecture

最終確認日: 2026-08-12

> この文書は移行期間中です。「Current」は現在の `v5` branch (`4e06452`) に実装されている v4 由来構造、「Target」は v5 で採用するが未実装の構造です。移行完了後は Target を Current に統合し、未実装事項を `roadmap.md` のみに残します。

## Current: 現在実装されている構造

### パッケージと公開 API

monorepo は主に次で構成されています。

- `packages/minista`: SSG 本体。実装は JavaScript、型は隣接する `.d.ts`
- `packages/create-minista`: starter 生成 CLI
- `docs`: minista 自身で構築する公開ドキュメント
- `playground`: plugin ごとの動作確認プロジェクト
- `packages/minista/test`: pure utility を中心とした Vitest test

`packages/minista/src/node.js` は Vite の `defineConfig` と 12 個の `pluginXXX()` を直接 export します。`pluginMdx()` を除く各機能は、状態を closure に持つ Vite plugin として実装されています。

### Current build lifecycle

`minista build` は `cross-spawn` で Vite CLI を二度起動します。

```text
minista build
  ├─ vite build --ssr
  │    └─ page/layout glob entry を bundle
  │         -> node_modules/.minista/ssr/__minista-ssg.mjs
  └─ vite build
       ├─ SSR bundle を native import
       ├─ getStaticData と React renderToString を実行
       ├─ node_modules/.minista/ssg/__minista-ssg.mjs へ HTML 配列を書き出す
       ├─ feature がそのファイルを glob + native import
       └─ Vite bundle を直接変更して HTML / asset を出力
```

二つの Vite process の間に in-memory contract はなく、`.minista` 内の実行可能な `.mjs` と生成 source が引き継ぎ protocol です。`--oneBuild` はこの前半を省略する escape hatch です。

### Current dev lifecycle

`pluginSsg()` が Vite middleware を登録し、request ごとに `server.ssrLoadModule(globFile)` で全 page/layout module を評価します。その後に route と一致する page を `renderToString()` し、`server.transformIndexHtml()` へ渡します。

Image / Sprite / Island なども `transformIndexHtml()` で HTML を解析・置換し、開発用 source や asset を `.minista` に生成します。Island と Search は `virtual:ssg-pages` を `ssrLoadModule()` して、SSG plugin の closure 内にある HTML 配列を取得します。

`pluginSsg()` の HMR は既に `this.environment`, environment module graph, `hotUpdate` を一部使用しますが、module evaluation は旧 `ssrLoadModule()`、reload は多くの場合 full reload です。

### Current data model

内部で共有される中心的な値は次の `SsgPage` です。

```ts
type SsgPage = {
  url: string
  fileName: string
  html: string
}
```

route source、動的 route の param、page instance、asset、island、image recipe、bundle artifact の関係をまとめた model はありません。それぞれの plugin が HTML の marker attribute / URL を再解析し、独自 map と cache を構築します。

### Current feature coupling

| Producer / consumer | 実際の contract | 問題 |
| --- | --- | --- |
| CLI → SSG | 二回の Vite process と `--ssr` | 一つの lifecycle として失敗・cleanup を扱えない |
| SSG → Entry/Image/Island/Search/Sprite | `.minista/ssg/*.mjs` の `ssgPages` | 型なし、実行可能 temp file、前回 build の残存を区別できない |
| Page → feature | HTML marker attribute と文字列 snippet | source identity と dependency が失われる |
| Island SSR → client build | encoded JSX snippet file と HTML 内の encoded snippet | 置換衝突、順序、生成 source に依存する |
| Vite output → feature | `generateBundle` で output bundle を探索・直接変更 | 複数 plugin が同じ HTML を順番に再parseする |
| Search / Entry | 生成済み HTML から URL を抽出 | asset / page graph がないため文字列解析が唯一の情報源 |
| Beautify / Archive | plugin order と `enforce: post` | feature 完了順が Vite hook order に埋め込まれる |

module-level global variable はほぼ使われていませんが、plugin instance closure の mutable state は environment 単位に key 化されていません。将来 plugin instance を environment 間で共有すると state 混線の危険があります。

### Current diagnostics and tests

- error は throw、`console.error`、警告文字列として出力され、安定した code / location / hint はない
- `check`, `inspect`, `explain` command と project manifest は未実装
- unit test は shared utility と SSG HTML utility、Image utility が中心
- playground build を一括実行する script はあるが、assertion を持つ fixture integration test にはなっていない
- JavaScript implementation と `.d.ts` が分離し、`StaticData.props` などに `any` が残る

## Current の主要問題

最大の問題は、Minista の domain lifecycle が Vite plugin hook に分散し、`.minista` の executable temp file と HTML 文字列が feature 間 API になっていることです。その結果、責務・入力・出力・順序・失敗地点を型や単一の graph から判断できず、人間も AI も局所変更の影響範囲を毎回コード全体から推測する必要があります。

## Target: v5 で採用する構造（未実装）

### Layer boundary

```text
Public API compatibility facade
  pluginSsg(), pluginImage(), defineConfig(), public types
                           ↓ feature descriptor
Minista Features
  ssg, mdx, image, island, entry, sprite, search, ...
                           ↓ typed phase input/output
Minista Core
  ProjectGraph, lifecycle, artifact store, diagnostics, manifest
                           ↓ ports
Adapters
  Vite adapter, filesystem adapter, React renderer, future CLI/JSON/MCP
```

依存方向は常に外側から Core へ向けます。Core は `vite`, React, HTML parser, filesystem concrete API を import しません。必要な処理は port interface として受け取ります。

### Target package layout

最初は package を増やさず `packages/minista/src` 内で境界を作り、API が安定してから物理 package 分割を判断します。

```text
packages/minista/src/
├─ public/                 # compatibility facade と public types
├─ core/
│  ├─ graph/              # immutable ID と graph mutation API
│  ├─ lifecycle/          # phase runner と feature scheduler
│  ├─ diagnostics/        # collector, formatter, error policy
│  ├─ manifest/           # versioned JSON schema
│  └─ artifacts/          # ArtifactStore port
├─ features/
│  ├─ ssg/
│  ├─ image/
│  ├─ island/
│  └─ ...
├─ adapters/
│  ├─ vite/
│  ├─ react/
│  └─ filesystem/
└─ cli/
```

旧 `src/plugins/*` は移行中の facade として残し、feature 移行後に内部から新実装を呼びます。

### Project Graph

Graph は一つの巨大 mutable object を各 feature に渡しません。安定 ID を持つ read model と、phase ごとに許可された command を分けます。

```ts
type NodeId<T extends string> = `${T}:${string}`

interface ProjectGraph {
  schemaVersion: "1"
  project: ProjectNode
  features: ReadonlyMap<FeatureId, FeatureNode>
  routes: ReadonlyMap<RouteId, RouteNode>
  pages: ReadonlyMap<PageId, PageNode>
  assets: ReadonlyMap<AssetId, AssetNode>
  islands: ReadonlyMap<IslandId, IslandNode>
  images: ReadonlyMap<ImageId, ImageNode>
  artifacts: ReadonlyMap<ArtifactId, BuildArtifact>
}

interface RouteNode {
  id: RouteId
  sourceFile: ProjectPath
  pattern: string
  params: readonly RouteParam[]
  pageModuleId: string
}

interface PageNode<Props extends Record<string, unknown> = Record<string, unknown>> {
  id: PageId
  routeId: RouteId
  url: string
  params: Readonly<Record<string, string>>
  props: Readonly<Props>
  metadata: Readonly<Record<string, unknown>>
  draft: boolean
}

interface PageArtifact {
  id: ArtifactId
  pageId: PageId
  document: HtmlDocument
  assetRefs: readonly AssetReference[]
  islandRefs: readonly IslandReference[]
  imageRefs: readonly ImageReference[]
  metadata: Readonly<Record<string, unknown>>
}

interface AssetNode {
  id: AssetId
  kind: "source" | "generated" | "remote" | "bundle"
  source?: ProjectPath
  contentHash?: string
  consumers: readonly PageId[]
  output?: OutputLocation
}

interface BuildArtifact {
  id: ArtifactId
  kind: "html" | "script" | "style" | "image" | "sprite" | "data" | "archive"
  owner: FeatureId
  source: ArtifactSource
  output?: OutputLocation
  dependencies: readonly ArtifactId[]
}
```

`ProjectPath` は project root 相対・POSIX separator・先頭 `/` なしに正規化します。ID は source identity と variant key から決定的に生成し、配列 index や discovery 順に依存させません。

`PageNode.props` と `metadata` は user module を実行する build session 内だけの runtime value で、manifest へ直列化しません。これにより、現行 API で利用できる JSON 以外の props も維持します。JSON 境界では別の allowlist projection を定義します。

HTML は外部出力形式であり続けますが、feature 連携の主 protocol にはしません。HTML を扱う feature は `HtmlDocument` port を通して marker と graph node ID を対応付け、同一 document を compose phase で一度だけ serialize します。

### Feature contract

各 `pluginXXX()` は target 内部では `MinistaFeature` を生成します。

```ts
interface MinistaFeature<Options = unknown> {
  id: FeatureId
  apiVersion: 1
  options: Readonly<Options>
  requires?: readonly Capability[]
  provides?: readonly Capability[]
  after?: readonly FeatureId[]
  hooks: Partial<FeatureHooks>
}

interface FeatureHooks {
  discover(ctx: DiscoverContext): Awaitable<void>
  resolve(ctx: ResolveContext): Awaitable<void>
  render(ctx: RenderContext): Awaitable<void>
  analyze(ctx: AnalyzeContext): Awaitable<void>
  generate(ctx: GenerateContext): Awaitable<void>
  compose(ctx: ComposeContext): Awaitable<void>
  emit(ctx: EmitContext): Awaitable<void>
  finalize(ctx: FinalizeContext): Awaitable<void>
}
```

phase 内の feature 順は user の Vite plugin 配列ではなく、`requires`, `provides`, `after` の dependency graph を topological sort して決めます。循環、capability 不足、同じ artifact の競合は diagnostic にします。`after` は同一 phase の tie-breaker に限り、data dependency は capability / graph edge で表現します。

### Lifecycle

採用 phase は次です。

| Phase | 主な結果 | I/O / side effect |
| --- | --- | --- |
| `discover` | feature、route source、source asset | project の read のみ |
| `resolve` | page instance、param、metadata、依存 edge | `getStaticData` 等の user code 実行を port 経由で許可 |
| `render` | page document と render diagnostic | renderer port を使用 |
| `analyze` | island/image/asset reference | document read、graph command のみ |
| `generate` | generated image、sprite、search data、client entry plan | ArtifactStore への content-addressed write |
| `bundle` | Vite が返す output manifest | Vite adapter のみが実行 |
| `compose` | hashed URL を反映した final document | HtmlDocument を一度 serialize |
| `emit` | dist と `.minista/manifest.json` | emitter port のみが filesystem write |
| `finalize` | beautify、archive、summary | declared artifact のみ変更可 |

Core runner は phase、feature、node ID を含む trace event を発行します。同じ input/config/content hash に対する phase は将来 cache 可能にしますが、初期実装では正しさを優先します。

### Artifact Store と manifest

`.minista` は暗黙の一時ディレクトリから、明示 contract を持つ workspace に変えます。

```text
.minista/
├─ manifest.json           # public machine-readable snapshot
├─ diagnostics.json        # last check/build diagnostics
└─ work/                   # private, buildId 単位、削除可能
   └─ <buildId>/
      ├─ render/
      ├─ generated/
      └─ client/
```

`manifest.json` は JSON data のみで、JavaScript module を import しません。最低限 `schemaVersion`, `generator`, `project`, `features`, `routes`, `pages`, `assets`, `artifacts`, `diagnosticSummary`, `createdAt` を持ちます。絶対 path、秘密情報、page props の任意データは既定で出力しません。manifest writer は安定 key order と atomic replace を使います。

`work/<buildId>` は phase 間の明示的 ArtifactStore です。producer、content hash、media type、schema version を metadata に記録し、別 build の残骸を読みません。

### Structured diagnostics

```ts
interface Diagnostic {
  code: `MINISTA_${string}`
  severity: "error" | "warning" | "info"
  message: string
  hint?: string
  location?: {
    file: ProjectPath
    line?: number
    column?: number
    endLine?: number
    endColumn?: number
  }
  phase?: BuildPhase
  feature?: FeatureId
  nodeId?: string
  related?: readonly DiagnosticRelatedLocation[]
  docsUrl?: string
}
```

例となる stable code は `MINISTA_ROUTE_DUPLICATE`, `MINISTA_ROUTE_MISSING_PARAM`, `MINISTA_FEATURE_CYCLE`, `MINISTA_ASSET_NOT_FOUND`, `MINISTA_RENDER_FAILED`, `MINISTA_MANIFEST_SCHEMA_UNSUPPORTED` です。人間向け formatter と JSON formatter は同じ collection を使用し、JSON mode では progress log を stdout に混ぜません。

### CLI / machine-readable interface

v5 Core の同じ query service を次から共有します。

- `minista check [--json]`: discovery / resolve / validation。dist を生成しない
- `minista inspect [--json]`: graph / manifest の要約または JSON
- `minista explain <route|file|artifact|diagnostic-code>`: edge と生成理由
- `minista build`: lifecycle 全体
- 将来の `@minista/mcp`: 上記 query service の adapter。Core の必須依存にはしない

JSON output は command ごとに versioned envelope を持ちます。

```ts
interface CommandResult<T> {
  schemaVersion: "1"
  command: "check" | "inspect" | "explain" | "build"
  ok: boolean
  data: T
  diagnostics: readonly Diagnostic[]
}
```

### Public / internal TypeScript boundary

- `public/` は user config、page/layout props、feature options、public component type のみ export
- `core/` の graph mutation command、adapter port、lifecycle context は package root から export しない
- implementation `.ts` / `.tsx` から declaration を生成する
- `JsonValue`, branded ID, discriminated union を使用し、arbitrary user value が必要な runtime boundary だけ `unknown` を使う
- user が module augmentation している `Metadata`, `PageProps`, `LayoutProps` は互換 facade で維持する

### Self-verification structure

```text
packages/minista/test/
├─ unit/                   # Core、graph、phase、pure feature logic
├─ fixtures/               # 最小 project と期待 manifest / diagnostics
└─ integration/            # dev request、HMR、full build、public API compatibility
```

manifest snapshot だけに依存せず、graph invariant、diagnostic code、dist artifact、公開 API type test を検証します。Vite experimental option の test matrix は通常 suite と分離し、失敗しても stable path の品質を隠さないようにします。

## Public API compatibility summary

| API | v5 方針 | 想定される差 |
| --- | --- | --- |
| `defineConfig()` | Vite の型付き facade として維持 | environment 用 helper type を追加可能 |
| `pluginSsg()` | lifecycle coordinator を含む compatibility facade | 戻り値は引き続き Vite `PluginOption`; 内部 hook は変更 |
| `pluginMdx()` | option shape と移行期間中の runtime return shape を維持し、MDX feature / Vite transform に分離 | public type は `PluginOption` として整理するが、配列 spread 利用も compatibility test で保護 |
| Image/Island/Entry/Sprite/Search | option と component import を維持 | temp path、marker、output hash の非公開挙動は保証しない |
| Svg/Comment/Beautify/Archive/Bundle | facade を維持して phase hook へ移行 | user plugin 配列順による偶発的順序は保証しない |
| `Metadata`, `PageProps`, `LayoutProps`, `StaticData` | export と module augmentation を維持 | `any` は source-compatible な範囲で generic / unknown 化 |
| `--oneBuild` | deprecation warning 後に削除 | v5 lifecycle では不要。移行中のみ受理 |

互換性の基準は documented API、option default、page/layout contract、出力 URL です。`node_modules/.minista` の配置、virtual module ID、Vite plugin name、生成 source 名、plugin closure state は非公開であり互換対象にしません。
