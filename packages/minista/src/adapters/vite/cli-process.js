// @ts-check

import { spawn } from "cross-spawn"

/** @typedef {import("node:child_process").ChildProcess} ChildProcess */

export class ViteCliProcessError extends Error {
  code = "MINISTA_VITE_CLI_FAILED"

  /** @param {import("./cli-process.js").ViteCliProcessErrorOptions} options */
  constructor(options) {
    const result = options.cause
      ? `could not start: ${options.cause.message}`
      : options.signal
        ? `terminated by signal ${options.signal}`
        : `exited with code ${options.exitCode ?? "unknown"}`
    const message = `External Vite CLI ${options.environment} process ${result}.`
    super(message, options.cause ? { cause: options.cause } : undefined)
    this.name = "ViteCliProcessError"
    this.environment = options.environment
    this.exitCode = options.exitCode
    this.signal = options.signal
    this.diagnostic = Object.freeze({
      code: this.code,
      severity: "error",
      message,
      ...(options.phase ? { phase: options.phase } : {}),
      hint: "Review the preceding Vite output for the original failure.",
    })
  }
}

export class ViteCliProcessAdapter {
  #spawn

  /**
   * @param {(command: string, args: readonly string[], options: import("node:child_process").SpawnOptions) => ChildProcess} [factory]
   */
  constructor(factory = spawn) {
    this.#spawn = factory
  }

  /**
   * @param {readonly string[]} args
   * @param {import("./cli-process.js").ViteCliProcessOptions} [options]
   */
  run(args, options = {}) {
    const environment = options.environment ?? "command"
    return new Promise((resolve, reject) => {
      const child = this.#spawn("vite", args, {
        stdio: "inherit",
        env: { ...process.env, ...options.variables },
      })
      child.once("error", (cause) => {
        reject(new ViteCliProcessError({
          environment,
          phase: options.phase,
          cause,
        }))
      })
      child.once("close", (exitCode, signal) => {
        if (exitCode === 0) {
          resolve(0)
          return
        }
        reject(new ViteCliProcessError({
          environment,
          phase: options.phase,
          exitCode,
          signal,
        }))
      })
    })
  }
}
