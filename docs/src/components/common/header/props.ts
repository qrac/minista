export type Props = {
  isSticky: boolean
  currentVersion: string
  versionItems: { name: string; url: string; externalLink: boolean }[]
  mainItems: { name: string; url: string; externalLink: boolean }[]
}

export const initialProps: Props = {
  isSticky: false,
  currentVersion: "0.0.0",
  versionItems: [{ name: "v0.0.0", url: "/", externalLink: true }],
  mainItems: [{ name: "Home", url: "/", externalLink: false }],
}
