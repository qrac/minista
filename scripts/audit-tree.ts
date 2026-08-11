import { execSync } from "node:child_process"
import { styleText } from "node:util"

type Severity = "low" | "moderate" | "high" | "critical"

interface Advisory {
  title: string
  url: string
}

interface FixAvailable {
  name?: string
  version?: string
  isSemVerMajor?: boolean
}

interface Vulnerability {
  severity: Severity
  range?: string
  via?: Array<string | Advisory>
  nodes?: string[]
  fixAvailable?: boolean | FixAvailable
}

interface AuditResult {
  vulnerabilities?: Record<string, Vulnerability>
}

interface FixChange {
  name: string
  from?: string
  to?: string
}

function exec(command: string): string {
  try {
    return execSync(command, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        FORCE_COLOR: "1",
      },
    })
  } catch (error) {
    if (typeof error === "object" && error !== null && "stdout" in error) {
      return String(error.stdout)
    }

    throw error
  }
}

function execQuiet(command: string): string | null {
  try {
    return execSync(command, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
  } catch {
    return null
  }
}

function bold(text: string): string {
  return styleText("bold", text)
}

function colorSeverity(severity: Severity): string {
  switch (severity) {
    case "critical":
    case "high":
      return styleText(["bold", "red"], severity)
    case "moderate":
      return styleText(["bold", "yellow"], severity)
    case "low":
      return styleText(["bold", "blue"], severity)
  }
}

function getLatestVersion(name: string): string | null {
  return execQuiet(`npm view "${name}" version`)
}

function getFixVersion(vuln: Vulnerability): string | null {
  if (typeof vuln.fixAvailable === "object" && vuln.fixAvailable !== null) {
    return vuln.fixAvailable.version ?? null
  }

  return null
}

function getFixLabel(vuln: Vulnerability): string {
  if (vuln.fixAvailable === false) {
    return "No fix available"
  }

  if (
    typeof vuln.fixAvailable === "object" &&
    vuln.fixAvailable !== null &&
    vuln.fixAvailable.isSemVerMajor
  ) {
    return "Available via `npm audit fix --force`"
  }

  return "Available via `npm audit fix`"
}

function printDependencyTree(name: string): void {
  try {
    const tree = execSync(`npm ls "${name}" --depth=20 --color=always`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      env: {
        ...process.env,
        FORCE_COLOR: "1",
      },
    })

    console.log(tree.split("\n").slice(1).join("\n").trim())
  } catch (error) {
    if (typeof error === "object" && error !== null && "stdout" in error) {
      console.log(String(error.stdout).split("\n").slice(1).join("\n").trim())
    }
  }
}

function collectFixChanges(): FixChange[] {
  const raw = exec("npm audit fix --dry-run --json")

  try {
    const json = JSON.parse(raw) as any
    const changes: FixChange[] = []

    const candidates = [
      json?.change,
      json?.actions,
      json?.changed,
      json?.updated,
      json?.auditReport?.actions,
    ].filter(Array.isArray)

    for (const list of candidates) {
      for (const item of list) {
        if (item?.from?.name && item?.to?.version) {
          changes.push({
            name: String(item.from.name),
            from: String(item.from.version),
            to: String(item.to.version),
          })
          continue
        }

        const name = item?.module ?? item?.name ?? item?.package
        const from = item?.from ?? item?.oldVersion ?? item?.current
        const to = item?.to ?? item?.version ?? item?.newVersion

        if (name && (from || to)) {
          changes.push({
            name: String(name),
            from: from ? String(from).replace(`${name}@`, "") : undefined,
            to: to ? String(to).replace(`${name}@`, "") : undefined,
          })
        }
      }
    }

    return changes
  } catch {
    return []
  }
}

const audit = JSON.parse(exec("npm audit --json")) as AuditResult
const vulnerabilities = Object.entries(audit.vulnerabilities ?? {})

if (vulnerabilities.length === 0) {
  console.log(`found ${styleText(["bold", "green"], "0")} vulnerabilities`)

  process.exit(0)
}

const fixChanges = collectFixChanges()

for (const [name, vuln] of vulnerabilities) {
  const latestVersion = getLatestVersion(name)
  const fixVersion = getFixVersion(vuln)
  const changes = fixChanges.filter((change) => change.name === name)

  console.log(`${bold(name)}  ${vuln.range ?? ""}`)
  console.log(`Severity: ${colorSeverity(vuln.severity)}`)

  for (const via of vuln.via ?? []) {
    if (typeof via === "object") {
      console.log(`${via.title} - ${via.url}`)
    }
  }

  for (const node of vuln.nodes ?? [`node_modules/${name}`]) {
    console.log(node)
  }

  printDependencyTree(name)

  if (latestVersion) {
    console.log(`Latest: ${latestVersion}`)
  }

  if (fixVersion) {
    console.log(`Fixed by: ${fixVersion}`)
  }

  console.log(getFixLabel(vuln))

  for (const change of changes) {
    console.log(`└─from: ${change.from ?? "?"} - to: ${change.to ?? "?"}`)
  }

  console.log("")
}
