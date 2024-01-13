import type { StoryMeta as Meta, StoryObj } from "minista-plugin-story/client"

import Component from "."

export const metadata = {
  layout: "story",
}

const meta = {
  title: "Components/Button",
  component: Component,
  decorators: [
    (Story) => {
      return (
        <>
          <div className="decorator-1">
            <Story />
          </div>
        </>
      )
    },
    (Story) => {
      return (
        <>
          <div className="decorator-2">
            <Story />
          </div>
        </>
      )
    },
  ],
} satisfies Meta<typeof Component>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: {
    text: "Primary",
    colorScheme: "cyan",
    variant: "solid",
  },
}
export const Secondary: Story = {
  args: {
    text: "Secondary",
    colorScheme: "blue",
    variant: "solid",
  },
  decorators: [
    (Story) => {
      return (
        <>
          <div className="decorator-3">
            <Story />
          </div>
        </>
      )
    },
  ],
}
