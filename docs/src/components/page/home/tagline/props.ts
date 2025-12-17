export type Props = {
  heading: string
  texts: string[]
  note: string
}

export const initialProps: Props = {
  heading: "すべてをJSXで書き、綺麗なHTMLを生成！",
  texts: [
    "静的HTMLが必要なウェブ制作の現場にもJSXのコンポーネント管理を導入したい。",
    "独自構文を使わず、エディタサポートの優れたTypeScriptを活用したい。",
  ],
  note: "ー minista コンセプト",
}
