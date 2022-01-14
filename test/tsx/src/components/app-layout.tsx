export interface AppLayoutProps {
  children?: React.ReactNode
}

export const AppLayout = (props: AppLayoutProps) => {
  const { children } = props
  return <main>{children}</main>
}
