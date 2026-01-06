import { FiSearch, FiX } from "react-icons/fi"
import { Search } from "minista/assets"

import type { Props } from "./props"
import { initialProps } from "./props"

export default function ElementSearch(props: Partial<Props>) {
  const {} = { ...initialProps, ...props }
  return (
    <Search
      client:load
      field={{
        beforeElement: <FiSearch />,
        clearElement: (
          <button type="button" className="search-field-clear">
            <FiX />
          </button>
        ),
        placeholder: "Search...",
      }}
    />
  )
}
