import type { RefObject } from 'react'
import { EXPRESSION_REFERENCE } from '../language/expressionReference'
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
          <table className="info-table expression-reference-table">
            <tbody>
              {section.entries.map(([source, meaning]) => (
                <tr key={source}>
                  <th scope="row"><code>{source}</code></th>
                  <td>{meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </InfoDialog>
  )
}
