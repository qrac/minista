export async function getStaticData() {
  return [
    { paths: { slug: "one" }, props: { title: "One" } },
    { paths: { slug: "two" }, props: { title: "Two" } },
  ]
}

/** @param {{title?: string}} props */
export default function Post({ title } = {}) {
  return <h1>{title}</h1>
}
