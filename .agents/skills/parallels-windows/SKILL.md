---
name: parallels-windows
description: macOSからParallels DesktopのCLIでWindows VM内のコマンド、Webサイト、ブラウザ表示を検証し、ログ・画面・環境情報を残すときに使う。
---

# ParallelsによるWindows検証

`prlctl`でWindows VMを操作する。ministaでの対象選択とコマンド例は[Windows検証手順](../../../context/windows-parallels.md)を参照する。他のリポジトリではそのプロジェクトの検証手順を優先する。

## 対象と接続

- `command -v prlctl`、`prlctl --version`、`prlctl list --all`、`prlctl list -i <VM>`でCLI、VMのID・OS・状態、Tools、共有フォルダ、`Pause idle`を確認する。VM名、共有パス、IP、CPU architectureは固定しない。候補が複数あり対象が特定できなければ選択を確認する。
- VMの初期状態を記録する。検証に必要なら停止中は`start`、一時停止中は`resume`、サスペンド中は`start`を使う。構文はインストール済みの`prlctl <command> --help`で確認する。
- `/bin/ps: Operation not permitted`に続く初期化エラーはサンドボックス制限の可能性がある。対象の`prlctl`だけ適切な実行権限で再試行し、これだけを理由に`sudo inittool2`や再インストールを実行しない。スキルは実行権限を追加しない。
- 現在のユーザーとWindows情報、対象ファイルの読取可否を確認する。Toolsが古い場合も自動更新せず、実際の接続結果で利用可否を判断する。

## ゲストコマンド

`prlctl exec <VM> --current-user`を使う。ブラウザ起動では特に重要で、省略すると別セッションで起動してVM画面に現れない場合がある。

複雑なPowerShellはUTF-8の`.ps1`としてホストに保存し、次の補助スクリプトで実行する。内容をUTF-16LEの`EncodedCommand`へ変換し、ホストとゲストを跨ぐ引用符の解釈を避ける。Python 3と`prlctl`が必要。

```sh
python3 <skill-directory>/scripts/exec-powershell.py --vm '<VM-ID>' --file /absolute/path/check.ps1
```

補助スクリプトはPowerShellのエラーを失敗扱いにし、通常60秒で待機を打ち切る。長いbuildなどは`--timeout`で必要な上限を指定する。外部CLIの直後に`$LASTEXITCODE`を確認し、失敗時は`exit $LASTEXITCODE`で終了する。最終processの成功だけで途中の検査成功を判断しない。

待ち続けたらホスト側の待機を打ち切り、VM状態を確認する。一時停止中なら再開し、読取検査を一度だけ再試行する。タイムアウトはゲストprocessの終了を保証しない。書込・build・インストールはprocessと出力を確認するまで再実行しない。

## 検証と証跡

- Macから配信したページのWindows表示と、Windows上のNode.jsで実行したCLI結果を区別する。共有HTMLの表示だけでWindows CLI互換性を合格にしない。
- ゲストでNode.jsを動かす場合、Macの`node_modules`を使わず、Windows内の作業コピーで依存を導入する。共有フォルダの書込はホストにも反映される。作業コピーには検証対象の未コミット変更も含め、秘密情報や不要な依存はコピーしない。
- HTTP到達、対象ページ、表示・操作結果を確認する。開けたことだけでIslandのハイドレーション、検索、Service Workerの成功を報告しない。Service WorkerはWindows側のlocalhostかHTTPSで確認する。
- ブラウザのインストール先を発見し、検証専用の一時プロファイルを使う。VMが動作中で画面が更新されたことを確認して`prlctl capture <VM> --file <absolute PNG path>`で撮影し、画像ツールで実画像を見る。対話画面とヘッドレス結果を区別する。
- コマンド、stdout・stderr、終了code、Git状態、Windows/CLI/Tools/Node.js/ブラウザ版とarchitectureを記録する。画面検証にはURL、解像度、Windows拡大率、ブラウザ倍率も添える。未取得の値は推測しない。

## 終了

自分が起動したserver・ブラウザprocessと作業用ファイルだけを片付ける。既存のブラウザを一括終了しない。変更したVM設定を戻し、最初がpausedならpause、suspendedならsuspend、stoppedなら正常shutdownで元へ戻す。最初がrunningならrunningを保つ。復元前に自分の検証processの終了を確認し、他の作業と競合する場合は復元を保留して理由を報告する。強制停止やスナップショット復元を通常の後片付けに使わない。

「CLI接続」「Windows CLI実行」「Windowsブラウザ表示・操作」をそれぞれ合格・不合格・未検証で報告し、ログと画像の保存先、復元結果を添える。
