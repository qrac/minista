# Parallels DesktopによるWindows検証

Mac側のCodexからWindows VMでCLIやWebページを確認するための任意の検証手順。入口は[parallels-windowsスキル](../.agents/skills/parallels-windows/SKILL.md)。`$parallels-windows`で明示的に呼び出せる。通常のテストへVM起動を追加しない。

## 検証対象の選択

[testing.md](testing.md)に従い、変更に関係するfixtureまたはplaygroundだけを選ぶ。

- Windowsのpath、process、CLI終了codeが対象ならWindows内のNode.jsで実行する。開発・CLI・testは`src/`を直接使い、パッケージの事前buildを要求しない。
- HTML、CSS、Island、検索などのWindows表示が対象ならMacで対象playgroundを起動またはbuildし、WindowsのChrome/Edgeから配信URLへアクセスする。Windows CLIの検証とは別に記録する。
- Windowsの作業コピーに未コミット変更を含む対象sourceとlockfileをコピーし、Windows用の依存を導入する。Macの`node_modules`を共有して実行しない。VM内の一時作業先を用い、共有リポジトリへ`npm ci`を実行しない。

## PowerShellの実行

ホストにUTF-8の`.ps1`を保存し、リポジトリrootから実行する。

```sh
python3 .agents/skills/parallels-windows/scripts/exec-powershell.py --vm '<発見したVM-ID>' --file /absolute/path/check.ps1
```

接続確認用の例。共有名とパスは`prlctl list -i`で発見した値へ置き換える。

```powershell
whoami
Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, BuildNumber, OSArchitecture
$env:PROCESSOR_ARCHITECTURE
$repo = '\\Mac\github\minista'
if (-not (Test-Path -LiteralPath "$repo\package.json")) { throw 'Shared repository is not readable' }
node --version
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm --version
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
```

通常の`-Command`は引用符が失われる場合があるため、補助スクリプトはUTF-16LEの`EncodedCommand`を使う。日本語やUNCパスを保持し、`--current-user`も付ける。外部CLIの失敗は呼出側で確認して明示的に終了する。

Windows側に依存を導入した作業コピーで、必要なCLIだけを選ぶ例。

```powershell
Set-Location -LiteralPath 'C:\path\to\windows-work-copy'
node packages/minista/bin/minista.js check packages/minista/test/fixtures/check-basic --json
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
```

必要に応じて`inspect`、対象fixtureの`build`、関連するtestへ置き換える。出力と終了codeを保存し、JSON出力や生成物に目的の結果があることを確認する。

## ブラウザ表示

Mac側では例えば`npm run play:island -- --host 0.0.0.0`で対象だけを起動する。実際のserver出力のportとParallelsのnetwork情報を使ってURLを決め、WindowsからHTTP到達を確認する。ゲストの`localhost`はホストのserverを指さない。host IPやportを過去の値に固定しない。

ChromeまたはEdgeの実行ファイルをゲストで探索し、PowerShellで一時プロファイルを指定して起動する例。

```powershell
$browser = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $browser) { throw 'Chrome/Edge executable was not found' }
$url = 'http://<到達確認したhost-IP>:<port>/'
$response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 15
if ($response.StatusCode -ne 200) { throw 'Unexpected HTTP status' }
$profile = Join-Path $env:TEMP ('minista-browser-' + [guid]::NewGuid().ToString('N'))
$process = Start-Process -FilePath $browser -ArgumentList @("--user-data-dir=`"$profile`"", '--no-first-run', '--new-window', $url) -PassThru
$process.Id
$profile
```

process IDとプロファイルを保存する。終了時はこのプロファイルのprocessだけを確認して閉じる。起動processが終了していても子processが残る場合がある。`Stop-Process -Name chrome`などの一括終了は使わない。

HTTP成功だけでは表示・操作の合格にしない。`prlctl capture <VM> --file <absolute PNG path>`で取得し、画像ツールで確認する。クリック、DOM状態、console errorなどには利用可能なWindows側ブラウザ自動化を別途使う。操作手段がなければ静止画像から成功を推測せず未検証とする。Service Worker/PWAはゲスト内のlocalhostまたはHTTPSを用い、ホストのLAN HTTPや`file://`の結果で判断しない。

## 記録と後片付け

生ログ・画像はGit管理外の`.minista/windows-check/<run-id>/`などへ保存する。公開・Git管理が必要な証跡だけを確認して別途残す。Git commitと未コミット変更、VM初期状態、コマンド、版・architecture、判定、保存先、後片付け結果を記録する。

VM設定、Tools、OSやブラウザを自動更新しない。検証用processを片付け、元のVM状態へ戻す。VMが当初runningなら停止しない。

## 移植元と接続確認

SOROEMONOの[旧スキル](https://github.com/qrac/soroemono/blob/b2a181a261d061ec3c9805cf845ed073e89d52c7/.agents/skills/soroemono-windows-check/SKILL.md)、[接続調査](https://github.com/qrac/soroemono/blob/b2a181a261d061ec3c9805cf845ed073e89d52c7/context/windows-parallels.ja.md)、[後続のブラウザ記録](https://github.com/qrac/soroemono/blob/92696ed/context/verification-2.0.0a1-2026-09-23.ja.md)からVM・共有パスの再発見、`--current-user`、古い画面を証跡にしない方針を引き継いだ。フォント固有の工程は含めない。CLI構文はインストール済みのhelpを優先し、必要なら[Parallels公式資料](https://www.parallels.com/products/desktop/resources/)を参照する。

2026-10-11の設定時にParallels CLI 27.0.3 (58680)、Windows 11 ARM64 VMの検出、ゲストコマンド、共有`\\Mac\github\minista`の読取を確認した。Toolsは27.0.2-58673でoutdated表示。VM名・共有名は観測値であり、次回も再発見する。ministaのWindows CLI実行とブラウザ表示の合格記録ではない。
