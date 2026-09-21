# ADR索引

変更する契約に関係するADRを参照します。Context・却下案は記録当時の背景であり、現在の実装は[architecture.md](../architecture.md)、未実装・再検討条件は[roadmap.md](../roadmap.md)で確認できます。

| 対象 | ADR |
| --- | --- |
| 層・公開API・ランタイムと型 | [0001: Core／Feature／adapter](0001-core-feature-vite-adapter.md)、[0004: 公開plugin API](0004-plugin-api-compatibility.md)、[0006: JavaScript + JSDoc](0006-javascript-jsdoc-runtime.md) |
| Graph・phase・出力所有権 | [0002: Graphとphase](0002-project-graph-and-phases.md)、[0010: output claim](0010-explicit-output-claims.md) |
| Vite build／dev・lifecycle・rollback | [0003: Vite app build](0003-vite-app-build.md)、[0007: ModuleRunner dev](0007-programmatic-module-runner-dev.md)、[0015: lifecycleと出力transaction](0015-application-lifecycle-and-output-transaction.md) |
| Manifest・診断snapshot・read-only query | [0008: Project Manifest](0008-public-project-manifest.md)、[0009: diagnostics](0009-diagnostics-workspace-snapshot.md)、[0011: internal query](0011-internal-read-only-query-boundary.md) |
| 外部buildの受け渡し・workspace・agent入口 | [0012: JSON handoff](0012-json-external-build-handoff.md)、[0016: workspaceとagentガイド](0016-workspace-and-agent-guide.md) |
| SSG・renderer・MDX・Layout・Entry・public asset | [0005: React renderer](0005-react-static-renderer.md)、[0013: page formatとrender asset](0013-ssg-page-formats-and-render-assets.md)、[0014: Layout document](0014-layout-document-root.md)、[0019: Entry統合](0019-ssg-entry-composition.md)、[0022: public asset base](0022-ssg-public-asset-base.md) |
| Beautify・image preload | [0017: 整形境界とpreload](0017-beautify-output-and-ssg-preload.md) |
| Archive | [0018: stream出力](0018-archive-stream-publication.md) |
| Search | [0020: 複数indexと解析Artifact](0020-search-multiple-indexes.md) |
| Island | [0021: SSR propsのserialization](0021-island-serialized-props.md) |
