import AppHeader from "../app-header"
import AppMain from "../app-main"
import AppFooter from "../app-footer"

export default function ({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-layout">
      <AppHeader />
      <AppMain>{children}</AppMain>
      <AppFooter />
    </div>
  )
}
