import { Wrapper } from "../components/wrapper"
import { Space } from "../components/space"
import { Counter } from "../components/counter"

export default function () {
  return (
    <>
      <h1>Index</h1>
      <ul>
        <li>
          <a href="/nest/">Nest</a>
        </li>
      </ul>
      <div style={{ display: "grid", gap: "20px" }}>
        <Counter defaultCount={1} client:load />
        <Wrapper client:idle>
          <Counter defaultCount={2} />
          <Counter defaultCount={3} />
        </Wrapper>
        <Counter defaultCount={1} client:idle={{ timeout: 5000 }} />
        <Space height="100vh" />
        <Counter defaultCount={1} client:visible />
        <Space height="100vh" />
        <div client:visible={{ rootMargin: "200px" }}>
          <Counter defaultCount={2} />
        </div>
        <Counter defaultCount={1} client:media="(max-width: 500px)" />
        <Counter defaultCount={1} client:only />
        <Wrapper client:only>
          <div slot="fallback">Loading...</div>
          <Counter defaultCount={1} />
        </Wrapper>
      </div>
    </>
  )
}
