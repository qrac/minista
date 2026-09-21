# v5中核実装の作業記録

状態: 2026-09-05、中断後に再開し、依頼された設計・中核実装と検証を完了。変更はworking treeに保存済みで、未commit。

## 対象

[設計レビュー](2026-09-05-v5.md)に基づくlifecycle集約、config互換性、transaction。公開plugin APIを維持し、[ADR-0015](../decisions/0015-application-lifecycle-and-output-transaction.md)、既存ADR、architecture、vite、roadmapと公開Config文書を更新した。

## 完了内容

- 全feature descriptorを検証し、各Vite output境界でdomain pipelineを依存順に一度だけ実行するcoordinator
- devのserver単位の直列化、URLによるpage identity統一、Comment／Svg変換後のSearch解析
- Viteのbuilder.buildApp()とplugin前後hookを通るapplication orchestration
- isSsrBuild参照を検知し、同名pluginのclosureを取り違えず既存Legacy経路へ送るconfig互換性
- App／Legacy共通のclient出力確定、emptyOutDir:falseの保持、metadataを含む捕捉可能な失敗時のrollback
- error diagnosticによるphase停止、同一process再buildでのrender module cache更新

## 検証結果

- npm test: 96ファイル、390テスト成功。devサーバーのローカルlistenを許可した環境で全体実行
- npx tsc --noEmit: 成功
- compat-basicを隔離copyし、CLIのcheck --json、inspect --json、buildを実行: すべてexit 0
- check／inspectのJSON、生成HTML、manifest／diagnosticsのschemaVersion 1を確認
- git diff --check: 成功

利用制限確認時点で残っていたdev Searchの失敗は解決済み。異なるpage IDで同じURLをGraphへ登録していた点を修正し、内容変換の対象をComment／Svgに限定した。共有domain mutationは直列化した。

## 保証範囲

各feature内のscope付きphase bridgeは維持している。単一global phase loopへの移行は今後の候補。transactionは捕捉可能な失敗からの復元を対象とし、process強制終了時の復旧、同じ出力先への同時build、distとmetadataの同時可視化は保証しない。外部Vite CLI fallbackは従来どおりtransaction対象外。
