# ADR-0010: feature output ownershipを明示的なclaimでGraphへ統合する

- Status: Accepted with incremental migration
- Date: 2026-08-13

## Context

Vite client build後には最終file nameとURLが確定しますが、Output Manifestだけでは、どのfeatureが生成したか、どのPageが利用するか、どのArtifactに依存するかを復元できません。file name patternや生成済みHTMLから推測すると、設定変更とplugin orderに依存する新しい暗黙protocolになります。

一方、各compatibility pluginは自分がemitしたreference ID、確定file name、解析対象Pageをgenerate phaseで把握しています。この情報をplugin closureだけに残すと、Project Graphと公開manifestへ反映できません。

## Decision

client pluginはoptionalな `api.minista.outputClaims()` でoutput claimを公開します。claimはArtifact ID、kind、owner Feature ID、source label、確定file name、consumer Page URL、Artifact dependencyだけを持ち、HTML本文、bundle code、絶対pathを含めません。

Vite adapterはclient build完了後にfeature descriptorとclaimを収集します。Core `applyOutputClaims()` はclaimのfile nameをOutput Manifestと照合し、存在するoutputだけをBuildArtifactとgenerated AssetとしてProject Graph snapshotへ追加します。Page URLは既存PageNode IDへ解決し、Asset consumerに保存します。存在しないoutputは `MINISTA_OUTPUT_CLAIM_NOT_FOUND`、owner descriptorがないclaimは `MINISTA_OUTPUT_CLAIM_OWNER_NOT_FOUND` とします。

最初にSSGのHTML outputを接続し、Entryのscript／style、Image、Sprite、Search dataまで移行しました。残るcompatibility featureも、自身のgenerate／bundle処理で確定した情報から段階的にclaimを公開します。

## Consequences

- route → page → generated asset／artifact → outputを安定IDで追跡できる
- plugin間でHTML文字列、一時file、module global stateを共有しない
- claimは実在outputとの照合後だけGraphへ入る
- 同じprotocolをApp Build、programmatic legacy、外部CLI handoffで使用できる
- 未移行featureのoutputはcatalogには現れるがowner／consumer edgeを持たない

## Rejected alternatives

### file name patternからownerを推測する

user設定とhash patternで壊れ、第三者pluginとの衝突も区別できないため採用しません。

### 生成済みHTMLを再解析して全consumerを求める

文字列markerへの依存を再導入し、featureが既に持つ解析結果を失うため採用しません。

### build sessionへpluginが直接Graph mutationを行う

Vite hook orderがGraph mutation orderになり、未確定outputを登録できるため採用しません。claim収集と検証をclient build後へ集約します。

## Reconsider when

- 全compatibility featureがCore lifecycleへ移行し、bundle phaseのGraph commandとして直接表現できる場合
- Viteがplugin output ownershipをmachine-readableに提供した場合
