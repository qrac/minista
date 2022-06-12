import { Search } from "../../../"

import "./block-search.css"
import SvgrSearch from "../assets/svgs/search.svg"

const BlockSearch = () => {
  return (
    <div
      style={{
        maxWidth: "600px",
        padding: "16px",
        backgroundColor: "#f5f6f7",
        borderRadius: "12px",
      }}
    >
      <Search
        jsonPath="/assets/search.json"
        //maxHitPages={2}
        className="block-search"
        placeholder="Search..."
        searchFieldInsertBeforeElement={
          <SvgrSearch className="block-search-icon" />
        }
        searchFieldClassName="block-search-field"
        searchListClassName="block-search-list"
      />
    </div>
  )
}

export default BlockSearch
