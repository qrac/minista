/** @param {{children: import("react").ReactNode}} props */
export default function Layout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
