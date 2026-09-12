# create-minista

## About

Start a [minista](https://minista.qranoko.jp/) project with a simple command.

## How To Use

```sh
# Interactive
npm create minista@latest

# Shortcut
npm create minista@latest my-minista-project -- --template minimal-ts
```

| Template     | Description                   |
| ------------ | ----------------------------- |
| `basic-js`   | Basic setup with JavaScript   |
| `basic-ts`   | Basic setup with TypeScript   |
| `minimal-js` | Minimal setup with JavaScript |
| `minimal-ts` | Minimal setup with TypeScript |

## License

- MIT

## Credit

- Author: [Qrac](https://qrac.jp)
- Organization: [QRANOKO](https://qranoko.jp)

## Agent Guide

Every template creates a short `AGENTS.md` that points to `npx --no-install minista agents`.

Existing instructions are preserved. After installation, run the following command to add or update only the minista block:

```sh
npx --no-install minista agents --write
```

The detailed guide is included with the installed version of minista.
