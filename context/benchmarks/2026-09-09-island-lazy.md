# Island条件付きmodule読み込みの測定

測定日: 2026-09-09。P07の実装後を測定した参考値であり、変更前baselineとの速度比較ではない。

## 条件

- macOS、Node.js 26.2.0（x64）、Vite 8.2.2、React 19.2.8、Preact 10.29.8。
- `packages/minista/test/fixtures/island-lazy`のbuild出力をPython HTTP serverでlocalhost配信。圧縮・帯域制限なし。Codexの実ブラウザで確認した。
- 転送量測定は`other.jsx`のページ分割回帰fixture追加前の5ページ構成。最終fixtureには別componentのページを追加しているため、同じbyte数を再現する場合は一時copyから`src/pages/other.jsx`を除く。
- 画面外に同じ`client:visible`componentを2配置。初期表示後、アンカーリンクのクリックで表示した。SSRで必要なCSSは初期HTMLに残した。
- 測定用scriptだけを一時的な配信コピーへ追加し、Resource TimingとDOM上のmodule評価／useEffect回数を記録した。製品runtimeへの計測処理追加はない。
- 転送値は`PerformanceResourceTiming.transferSize`でheader込み。HTML、測定script、faviconの404応答は下表から除外した。未使用originの`localhost`でcold取得を確認した。

## 初期転送と条件成立後

| resource | 条件成立前 | 条件成立後の追加転送 |
| --- | ---: | ---: |
| Island entry＋scheduler＋Vite preload helper | 3,459 B | 0 B |
| SSG由来CSS | 329 B | 0 B |
| snippet | 0 B | 1,158 B |
| snippet CSS | 0 B | 329 B |
| 共有React chunk | 0 B | 7,855 B |
| renderer＋React DOM | 0 B | 182,695 B |
| 合計 | 3,788 B | 192,037 B |

遅延対象の先行取得は発生しなかった。条件成立前のcomponent評価・hydrationは0回、成立後は評価1回・hydration2回。両方のボタンをクリックし、独立してCount: 1へ更新された。Viteのpreload helperによる共有chunk取得も条件成立後だった。CSSはSSG由来の初期stylesheetに加えてasync側のCSSも取得された。

リンククリックから2要素のuseEffectまで39.5ms。別originで最初に確認した回は43.5msだった。useEffect時点を操作準備完了のproxyとし、実際のクリック操作成功も確認した。2回だけのlocalhost参考値で、中央値・p95や実回線の性能保証ではない。SSR由来CSSとasync CSSの統合・重複転送削減はこの測定の対象外。

## 動作確認

- React build: visible不成立時の未取得・未評価、成立後の2instance、mediaの不成立→幅500pxへの変更→取得・操作、idle、onlyを確認した。
- React dev: visible不成立時にmodule評価0回、成立後に評価1回・hydration2回、2instanceの操作を確認した。
- Preact:既存の`isSsrBuild`依存aliasを使うLegacy buildで同じvisible fixtureを実行し、評価1回・hydration2回と2instanceの操作を確認した。
- browser consoleにhydration errorはなかった。
- 自動testはcallbackが発火するまでidleのloaderを呼ばないこと、idle fallback、繰返し通知、失敗、切断要素、ページ分割有効／無効、遅延chunkのclaimを補完する。

## 再測定

1. fixtureを一時directoryへcopyし、`node packages/minista/bin/minista.js build <fixture> --logLevel silent`でbuildする。
2. distをHTTP配信する。JSをtypecheck対象へ混ぜないよう、配信コピーはリポジトリ外に置く。
3. browserの新しいoriginで`/`を開き、Resource Timingで初期resourceを記録する。
4. 「Show counters」をクリックし、初回module評価、2要素のeffect、追加resource、クリックからeffectまでの時間を記録する。
5. `/media.html`を幅600px超で開いて未評価を確認し、500pxへ変えて操作する。`/idle.html`、`/only.html`、dev、Preact buildを確認する。
