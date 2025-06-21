export type PluginOptions = {}
export type UserPluginOptions = Partial<PluginOptions>

export type CommentProps = CommentUseContent | CommentUseChildren

type CommentUseContent = {
  text: string
  children?: string
}
type CommentUseChildren = {
  text?: string
  children: string
}
