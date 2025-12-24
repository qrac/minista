import { clsx } from "clsx"

import type { Props } from "./props"
import { initialProps } from "./props"

export default function ElementModal(props: Partial<Props>) {
  const { modalId, position, slide, children } = {
    ...initialProps,
    ...props,
  }
  return (
    <dialog
      className={clsx(
        "modal",
        position && `is-position-${position}`,
        slide && `is-slide-${slide}`
      )}
      data-modal={modalId}
    >
      <div className="modal-container">{children}</div>
    </dialog>
  )
}
