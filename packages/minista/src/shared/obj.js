import { deepmergeCustom } from "deepmerge-ts"

export const mergeObj = deepmergeCustom({
  mergeArrays: false,
})
