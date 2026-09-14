export type Props = {
  license: string
  repositoryUrl: string
  xId: string
  xName: string
  copyrightSince: number
  copyrightUrl: string
  copyrightHolder: string
}

export const initialProps: Props = {
  license: "MIT",
  repositoryUrl: "https://example.com",
  xId: "Qrac_JP",
  xName: "Qrac",
  copyrightSince: 2021,
  copyrightUrl: "https://qranoko.jp",
  copyrightHolder: "QRANOKO",
}
