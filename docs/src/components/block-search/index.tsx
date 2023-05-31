import { Search } from "minista"

import { ReactComponent as IconSearch } from "../../assets/svgs/icon-search.svg"

export default function () {
  return (
    <Search
      placeholder="Search..."
      className="block-search"
      searchFieldClassName="block-search-field"
      searchFieldInsertBeforeElement={
        <IconSearch className="block-search-icon" />
      }
      searchListClassName="block-search-list"
    />
  )
}
