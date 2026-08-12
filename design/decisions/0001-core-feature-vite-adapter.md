# ADR-0001: Core / Feature / Vite Adapter の分離

- Status: Accepted
- Date: 2026-08-12

## Context

現行実装では route discovery、user module evaluation、render、asset discovery、HTML mutation、emit が Vite plugin hook 内にあります。Vite config mode と hook order が Minista の lifecycle そのものになっており、pure test と別 adapter からの再利用が困難です。

## Decision

Public API、Minista Feature、Minista Core、Adapter の四境界を採用します。

- Core は Vite / React / filesystem concrete API を import しない
- Feature は domain hook と capability を宣言する
- Vite plugin は environment / bundle object と Core port の変換に限定する
- public `pluginXXX()` は feature を Vite config に載せる compatibility facade とする
- 初期は一 package 内の directory boundary とし、安定後に package 分割を再評価する

## Consequences

- graph と feature logic を Vite なしで unit test できる
- CLI / JSON / future MCP が同じ query service を利用できる
- adapter interface と translation code が増える
- 移行中は旧 Vite plugin と新 feature の二系統を短期間保守する

## Rejected alternatives

### Vite plugin の整理だけを行う

hook file を分割しても domain lifecycle が Vite に所有されたままで、machine-readable graph と CLI query を共有できないため却下します。

### 最初から `@minista/core` 等へ package 分割する

公開 package boundary を早期固定し、移行時の変更コストを増やします。directory boundary と dependency lint で設計を検証してから判断します。

## Reconsider when

Core API を複数の独立 package / adapter が利用し、release cadence または dependency graph を分ける実益が確認された場合に物理 package 分割を再検討します。
