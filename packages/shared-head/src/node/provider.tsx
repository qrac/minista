import type { SetHeadData } from "../@types/shared.js"
import { HeadContext } from "../shared/index.js"

export function HeadProvider({
  headData,
  children,
}: {
  headData: { [key: string]: any }
  children: React.ReactNode
}) {
  const setHeadData: SetHeadData = (key: string, value: any) => {
    switch (key) {
      case "htmlAttributes":
      case "bodyAttributes":
        headData[key] = {
          ...headData[key],
          ...value,
        }
        break
      case "tags":
        headData[key] = [
          ...(headData[key] ? [headData[key]].flat() : []),
          ...[value].flat(),
        ]
        break
      default:
        headData[key] = value
    }
  }
  return (
    <HeadContext.Provider value={{ setHeadData }}>
      {children}
    </HeadContext.Provider>
  )
}
