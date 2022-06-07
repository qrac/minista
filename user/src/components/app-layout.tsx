import AppHeader from "~/components/app-header?ph"

type AppLayoutProps = {
  children: React.ReactNode
}

const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <>
      <AppHeader />
      {children}
    </>
  )
}

export default AppLayout
