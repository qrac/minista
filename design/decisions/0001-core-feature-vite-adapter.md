# ADR-0001: Core / Feature / Vite Adapterの分離

- Status: Accepted
- Date: 2026-08-12

## Context

現行実装ではroute discovery、user module evaluation、render、asset discovery、HTML mutation、emitがVite plugin hook内にあります。Vite config modeとhook orderがMinistaのlifecycleそのものになっており、pure testと別adapterからの再利用が困難です。

## Decision

Public API、Minista Feature、Minista Core、Adapterの四境界を採用します。

- CoreはVite / React / filesystem concrete APIをimportしない
- Featureはdomain hookとcapabilityを宣言する
- Vite pluginはenvironment / bundle objectとCore portの変換に限定する
- public `pluginXXX()` はfeatureをVite configに載せるcompatibility facadeとする
- 初期は一package内のdirectory boundaryとし、安定後にpackage分割を再評価する

## Consequences

- graphとfeature logicをViteなしでunit testできる
- CLI / JSON / future MCPが同じquery serviceを利用できる
- adapter interfaceとtranslation codeが増える
- 公開Vite pluginはcompatibility facadeとして残るが、domain処理はCore featureへ一本化する

## Rejected alternatives

### Vite pluginの整理だけを行う

hook fileを分割してもdomain lifecycleがViteに所有されたままで、machine-readable graphとCLI queryを共有できないため却下します。

### 最初から `@minista/core` 等へpackage分割する

公開package boundaryを早期固定し、移行時の変更コストを増やします。directory boundaryとdependency lintで設計を検証してから判断します。

## Reconsider when

Core APIを複数の独立package / adapterが利用し、release cadenceまたはdependency graphを分ける実益が確認された場合に物理package分割を再検討します。
