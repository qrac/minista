// @ts-check

import { createNodeId } from "../../core/graph/index.js"

export function createRenderedPagesArtifactId() {
  return createNodeId("artifact", "ssg-rendered-pages")
}
