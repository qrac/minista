# docsのCloudflare Workers公開

## 構成

公開originは`https://minista.dev`。latestは`/`、archiveは`/v3/`・`/v4/`とし、docs/project.jsonのarchive URLはroot absolute path、externalはfalseとする。旧archiveソースが生成するOGPの旧originは、公開処理で新originと各archiveのprefixへ補正する。旧originと旧Netlify URLは変換入力としてのみ公開scriptと検証例に残す。

v5をmainへマージする変更で、`.github/workflows/gh-pages.yml`を削除し、`cloudflare.yml`へ置き換える。互換性CIは残す。GitHub Pagesの既存公開・DNS・Cloudflare側の設定はworkflowの追加では変更しない。

`cloudflare`ブランチは成果物だけの独立履歴とする。公開directoryは`public/`、最新docsは直下、v3は`v3/`、v4は`v4/`。mainの`scripts/docs-deploy/wrangler.jsonc`をcloudflare branchのrootへコピーし、Workers Static Assetsの配信設定とする。Worker scriptは不要。HTMLはauto-trailing-slash、欠落URLは最寄りの404.htmlを404 statusで返す。Wrangler設定変更も公開処理hashに含める。`.deploy/state.json`は公開directory外に置き、schemaVersion 1、各対象のビルド元SHAと公開処理のhashを記録する。

mainからのpush、archiveからのrepository_dispatch、手動実行で起動する。共通concurrency groupを取得してから公開状態を読み、3ブランチの最新SHAを固定する。最後にビルドしたSHAと比較し、docs、本体、依存関係、scriptsの変更がある対象だけビルドする。公開処理のhash変更、初回、過去SHAの取得失敗は再ビルドする。イベント間の差分だけを使わず、未公開の変更を次回実行で回収する。

対象ごとにソースと依存を分離する。v3はNode 20.19.0で`build:main-src`後に`docs:build`、main／v4はNode 22.12.0で`docs-build`。v3のdist参照は旧CLI固有の要件であり、v5へ事前buildを導入しない。

全対象の成功後に既存成果物へ差し替える。main更新では`v3/`・`v4/`を削除しない。archive更新では対象directoryを全置換し、削除済みページを残さない。mainの出力が予約directoryと衝突した場合は失敗する。初回でも全対象を揃えるため、手動で単一対象を指定しても未公開対象は追加される。

公開状態の読み込み後にcloudflareのheadが変わった場合は失敗させ、再実行を要求する。force pushは使わない。成果物とstateを1コミットにしてpushする。失敗時に旧公開を変更しない。

## archiveのサブdirectory対応

ビルドcheckoutのdocs configだけに`/v3/`・`/v4/`のbaseを注入する。既知のconfig構造が変われば明示的に失敗する。v3はSSG page.pathへbaseが付くため、検索include／excludeにもprefixを付け、空の検索indexは失敗させる。生成HTMLのURL属性とOGP URLを補正し、本文のコード例・script・styleのテキストは変更しない。v3の検索JSONの結果pathを補正する。v4の検索結果はruntimeが設置先を解決するためJSONを変更しない。旧Netlifyのarchive URLは全バージョンで`/v3/`・`/v4/`へ変換する。v3の既存リンク`/docs/delivery`・`/docs/page`は実在するdelivery-support／pagesへ補正する。

補正は公開用の独立スクリプトに閉じ込める。Vite hookやminista公開API・adapterの契約は変更しない。任意のCSS・JS内のURL、srcset、hydration内部の任意URLを書き換える汎用変換ではない。旧docsの変更でこれらが追加された場合は専用対応とブラウザ確認が必要。

archive内のHTMLのhref／src／posterについて、prefix付きの内部参照が実ファイル、`.html`、`index.html`のいずれかへ解決できるか検証する。version間リンク、外部リンク、fragmentの存在、ブラウザ内の検索実行は別途初回確認する。

## 導入

1. v5側の変更をmainへマージする。初回workflowは3ブランチをビルドしてcloudflareブランチを作成する。
2. `scripts/docs-deploy/archive-trigger.yml`をv3-archiveとv4-archiveの`.github/workflows/cloudflare-archive.yml`へコピーする。この入口はGITHUB_TOKENでmain側のrepository_dispatchを呼ぶ。入口を追加するまではmain更新かmain側の手動実行でarchiveを更新できる。
3. GitHub Actionsにrepository contentsの書き込みを許可し、cloudflareブランチのルールでbotによる通常pushを許可する。
4. Cloudflare WorkersでGit repositoryを接続する。Worker名はminista、本番branchはcloudflare、build commandは`exit 0`、deploy commandは`npx wrangler@4 deploy`、root directoryはrepository root。静的asset directoryはwrangler.jsoncの`./public`から解決する。非本番branchの自動buildは無効にする。

   新規作成画面で本番branchを選べない場合、default branchのmainからデプロイしない。cloudflare branchのcheckoutから`npx wrangler@4 deploy`で初回公開し、既存WorkerのSettings > BuildsからGit repositoryを接続する。Branch controlで本番branchをcloudflareへ変更し、preview buildsを無効にしてから自動公開を運用する。Wrangler設定のあるmain内のdirectoryにはpublicがないため、そのままの公開元には使わない。

5. ActionsのGITHUB_TOKENによるpushでCloudflareのGit連携が公開を起動することを初回に確認する。GitHub Actions自身のpush trigger抑制と外部連携は区別する。連携が起動しない場合はCloudflare Workers Buildsのdeploy hookやGitHub ActionsからのWrangler deployへ切り替える判断を行う。
6. workers.devのURLでトップ、深いページの直接アクセス、検索JSON取得と検索結果の遷移、CSS／JS／画像、version切り替え、404を確認する。rootの404.htmlがない成果物は公開しない。
7. 動作確認後、WorkersのCustom Domainとしてminista.devを接続し、DNS／証明書を確認してからGitHub Pagesの公開を停止する。初回確認前はwrangler.jsoncにroutesを追加せず、本番domainへ接続しない。

workflow_dispatchのtargetはauto／main／v3／v4／all。autoは差分確認、他は指定対象の強制再ビルドを加える。既存cloudflareブランチにstateがない場合は自動で破壊せず失敗するので、既存成果物を確認して初期化方法を決める。

## 検証

`node --test scripts/docs-deploy/deploy.test.js`で、main更新時のarchive保持、古い成果物の削除、予約path衝突、archive単独更新、URL補正、ビルド対象pathを確認する。公開scriptは`node --check scripts/docs-deploy/deploy.js`で構文確認する。workflowはYAML構造を確認する。

公式資料（2026-10-06確認）:

- [GitHub Actions concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency): queue maxで複数待機を保持する。
- [GitHub Actions workflow triggers](https://docs.github.com/en/actions/concepts/security/github_token): repository_dispatchはGITHUB_TOKENによる起動抑制の例外。
- [Cloudflare Workers Git integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/): 成果物branchを監視してWranglerで公開する。
- [Cloudflare Workers build branches](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/): 本番branchは既定branchからBranch controlで変更する。
- [Cloudflare Workers SSG](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/): 拡張子なしURLと階層別404。
