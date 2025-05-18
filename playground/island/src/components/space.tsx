export function Space({ height }: { height: string }) {
  return (
    <div
      className="component-space"
      style={{
        height: height,
        padding: "12px",
        border: "1px solid #000",
      }}
    >
      <span>Space: {height}</span>
    </div>
  )
}
