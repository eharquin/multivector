import type { RefObject } from 'react'
import { EXPRESSION_REFERENCE } from '../language/expressionReference'
import { DefinitionTable } from './DefinitionTable'
import { InfoDialog } from './InfoDialog'

type ExpressionReferenceDialogProps = Readonly<{
  returnFocusRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
}>

export function ExpressionReferenceDialog({
  returnFocusRef,
  onClose,
}: ExpressionReferenceDialogProps) {
  return (
    <InfoDialog
      title="Expression Reference"
      labelledBy="expression-reference-title"
      returnFocusRef={returnFocusRef}
      onClose={onClose}
    >
      {EXPRESSION_REFERENCE.map((section) => (
        <section className="info-section" key={section.title}>
          <h3>{section.title}</h3>
          <DefinitionTable rows={section.entries} />
        </section>
      ))}
    </InfoDialog>
  )
}
