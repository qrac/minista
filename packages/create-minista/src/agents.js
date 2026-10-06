import fs from "node:fs/promises"
import path from "node:path"

/** Seed every template with the same entry point, retaining existing instructions.
 * @param {string} root
 */
export async function writeAgentBootstrap(root) {
  const block = await fs.readFile(new URL("../agents/bootstrap.md", import.meta.url), "utf8")
  try {
    await fs.writeFile(path.join(root, "AGENTS.md"), block, { encoding: "utf8", flag: "wx" })
  } catch (error) {
    if (!error || typeof error !== "object" || Reflect.get(error, "code") !== "EEXIST") throw error
    console.log("AGENTS.md preserved. Run npx --no-install minista agents --write after installation to add the minista guide.")
  }
}
