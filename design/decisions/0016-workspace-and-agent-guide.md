# ADR-0016: 生成workspaceの統一とagent向け入口

- Status: Accepted
- Date: 2026-09-08
- Amends: ADR-0008、0009、0011、0012、0015

## Context

公開snapshotはroot直下の`.minista`、Vite入力用sourceやcacheは`node_modules/.minista`に分散していました。後者はrootにpackage.jsonがない場合にcwd側へ移るため、同じprojectでも起動位置によって保存先が変わります。また、利用者がインストール済みバージョンの使い方とsnapshotを発見する共通の入口がありませんでした。

## Decision

Node filesystem adapterの`resolveWorkspaceDirectory(root)`が保存先を決めます。root直下にpackage.jsonがある場合は`<root>/node_modules/.minista`、ない場合は`<root>/.minista`です。親のpackage.json、既存node_modules、起動cwdを判定に使いません。resolver自体は書込みをしません。ViteのcacheDir設定とは独立し、CoreにfilesystemやVite依存を追加しません。

manifest／diagnosticsのreader、atomic writer、output transactionのmetadata退避・復元、外部handoff、従来のgetTempDir経由の生成sourceはこのresolverを共有します。各feature内のsubdirectory、同一processのArtifactStore、既存のphase契約は維持します。保存先を変えるための公開plugin optionは追加しません。

旧root直下snapshotへのfallback、旧directoryの自動移動・削除は行いません。アップグレード後はcheck／buildで再生成します。snapshotのschemaは変更しません。rootとpackage.jsonの有無は実行中に変更しない前提です。

ministaパッケージに利用者向け`AGENTS.md`と短いbootstrapを同梱します。`minista agents [root]`は同梱ガイドを表示し、`--json`はschemaVersion `"1"`のcommand resultとしてバージョン、絶対root、ガイドのpath／content、workspace directory、manifest／diagnosticsのpath／existsを返します。これはローカルtool向けの情報であり、絶対pathを除く公開manifestとは別の契約です。v1ではadditive field追加を許容し、既存fieldの意味を変える場合はversionを更新します。

表示系はconfig検出・評価、Vite server起動、user module実行、workspace生成を行いません。`--write`はAGENTS.mdのminista marker blockだけを追加・更新し、他の内容を保持します。新規fileはexclusive create、更新は同一directoryへの一時writeとrenameを使います。重複marker、不完全marker、symlinkなど通常fileでない対象は`MINISTA_AGENTS_CONFLICT`で拒否します。更新準備中の変更を再確認しますが、複数writerに対する完全なtransactionは保証しません。引数不正は`MINISTA_AGENTS_ARGS_INVALID`、その他は`MINISTA_AGENTS_FAILED`です。`--json --write`も同じresult形式で作成・更新・変更なしを返します。

create-ministaは全template共通処理で同じbootstrapを生成します。既存AGENTS.mdは保持し、install後の`agents --write`を案内します。create-ministaをminista本体へ依存させないため、小さなbootstrap resourceを両packageに同梱し、一致をtestします。詳細なバージョン固有説明はminista側だけが持ちます。postinstall処理は追加しません。

ガイドはsnapshot参照と現在のsource解析を区別します。`inspect --manifest`は保存済み情報だけをqueryし、通常のcheck／inspect／explainはuser moduleを評価します。manifest不在時の自動buildは行いません。manifestとdiagnosticsの時点が異なることも明示します。

## Rejected alternatives

- node_modulesの有無や親package探索で保存先を変える: install状態やmonorepoの構造によって別projectと共有されるため。
- AGENTS.mdにガイドの物理pathを固定する: packageの配置を推測する必要があるため、インストール済みCLIから取得する。
- 汎用initコマンドとpostinstall: 今回の機能の範囲を越え、意図しない既存projectの変更につながるため。
- cache／work以下の全再配置を同時に行う: 生成JSのimport解決やdev URLの変更と保存先統一を別に検証するため。

## Validation

package.jsonあり／なし、異なるcwd、親packageのあるnested root、旧snapshotを読まないこと、handoff cleanup、既存build rollback、dev asset配信を検証します。CLI表示のread-only性、構造化error、AGENTS.mdの保持・冪等性、全starterの生成内容とnpm梱包内容も検証します。
