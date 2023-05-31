export function getSpace({
  nameLength = 0,
  maxNameLength = 0,
  min = 0,
}: {
  nameLength?: number
  maxNameLength?: number
  min?: number
}) {
  const spaceCount = maxNameLength - nameLength + min
  const space = spaceCount > 0 ? " ".repeat(spaceCount) : ""

  return space
}
