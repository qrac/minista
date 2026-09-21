# minista contributor guide

- ランタイムはJavaScript + JSDoc、公開型は隣接する`.d.ts`に置き、内部型と分離する。開発・CLI・testは`src/`を直接使い、事前buildを要求しない。
- 公開API（`pluginXXX()`、`defineConfig()`）と内部実装を分離し、Viteの型・hook・experimental APIはadapterに閉じ込める。
- feature間の連携はProject Graph、Artifact Store、明示phaseを使い、HTML・一時ファイル・global stateへの暗黙依存を増やさない。順序はdescriptorのcapability／`requires`／`after`／`optionalAfter`で宣言し、診断は安定code付きで構造化する。
- 構造・責務・公開契約を変えるときは[設計索引](context/README.md)から該当節とADRを参照し、同じ変更で更新する。Vite APIの採用・fallback変更は[context/vite.md](context/vite.md)も更新する。
- 検証は変更に直接関係する最小範囲を選ぶ。成功後の拡大・反復は新しい根拠がある場合だけ。integration・互換性matrix・全playground buildは関連変更や再現に必要な場合だけ実行する。選び方とコマンドは[context/testing.md](context/testing.md)。
- 外部READMEは英語、内部文書は日本語。公開`docs/`は英語を既定とし日本語版も提供する。新規・大幅改稿や訳の差異は日本語で内容を確定し、意味・コード例・用語・リンク構造を揃えた自然な英語へ反映する。
- 日本語と英数字の間に一律のスペースを入れない。インラインコード・Markdownとの境界は可読性に応じて空け、コード・識別子・URL・コマンドは表記統一の対象にしない。
