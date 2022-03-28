import AppHeader from "./app-header"

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
