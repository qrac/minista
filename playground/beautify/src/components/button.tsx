import "./button.css"

export function Button({ children }: { children: React.ReactNode }) {
  return (
    <button type="button" className="button">
      {children}
    </button>
  )
}
