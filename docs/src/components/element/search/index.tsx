import { LuSearch, LuX } from "react-icons/lu"
import { Search } from "minista/assets"

import type { Props } from "./props"
import { initialProps } from "./props"

export default function ElementSearch(props: Partial<Props>) {
  const { locale } = { ...initialProps, ...props }
  return (
    <Search
      client:load
      field={{
        beforeElement: <LuSearch />,
        clearElement: (
          <button type="button" className="search-field-clear">
            <LuX />
          </button>
        ),
        placeholder: "Search...",
      }}
      index={locale}
    />
  )
}
