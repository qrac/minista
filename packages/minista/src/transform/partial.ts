export function transformPartial({
  originalId,
  rootDOMElement,
  dataAttr,
  style,
}: {
  originalId: string
  rootDOMElement: string
  dataAttr: string
  style: string
}) {
  return `import App from "${originalId}"
export default function () {
  return (
    <${rootDOMElement} ${dataAttr} style={${style}}>
      <App />
    </${rootDOMElement}>
  )
}`
}
