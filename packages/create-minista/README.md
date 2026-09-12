# create-minista

## About

簡単なコマンド入力で[minista](https://minista.qranoko.jp/)のプロジェクトを開始できます。

## How To Use

```sh
# Interactive
npm create minista@latest

# Shortcut
npm create minista@latest my-minista-project -- --template minimal-ts
```

| テンプレート | 内容 |
| --- | --- |
| `basic-js` | JavaScriptを使った基本構成 |
| `basic-ts` | TypeScriptを使った基本構成 |
| `minimal-js` | JavaScriptを使った最低限の構成 |
| `minimal-ts` | TypeScriptを使った最低限の構成 |

## License

- MIT

## Credit

- Author: [Qrac](https://qrac.jp)
- Organization: [QRANOKO](https://qranoko.jp)

## Agent guide

Every template creates a short `AGENTS.md` pointing to `npx --no-install minista agents`. Existing instructions are preserved; after installation, run `npx --no-install minista agents --write` to add or update only the minista block. The detailed guide ships with the installed minista version.
