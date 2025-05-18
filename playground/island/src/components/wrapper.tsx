export function Wrapper(props: { children: React.ReactNode }) {
  return (
    <div
      className="component-wrapper"
      style={{
        display: "grid",
        gap: "8px",
        padding: "12px",
        border: "1px solid #000",
      }}
    >
      <div>
        <span>Wrapper</span>
      </div>
      {props.children}
    </div>
  )
}
