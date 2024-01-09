export default function ({
  text,
  colorScheme,
  variant,
}: {
  text: string
  colorScheme: "cyan" | "blue"
  variant: "solid"
}) {
  return (
    <button type="button" className={`button is-${colorScheme} is-${variant}`}>
      {text}
    </button>
  )
}
