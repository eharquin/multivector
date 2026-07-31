import type { RefObject } from 'react'
import { VGA_2_INFO } from '../algebra/vga2Info'
import { InfoDialog } from './InfoDialog'

type AlgebraInfoDialogProps = Readonly<{
  returnFocusRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
}>

function InfoTable({ rows }: Readonly<{ rows: readonly (readonly [string, string])[] }>) {
  return (
    <table className="info-table">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <th scope="row">{label}</th>
            <td><code>{value}</code></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function AlgebraInfoDialog({
  returnFocusRef,
  onClose,
}: AlgebraInfoDialogProps) {
  return (
    <InfoDialog
      title={`${VGA_2_INFO.name} ${VGA_2_INFO.signature}`}
      labelledBy="algebra-info-title"
      returnFocusRef={returnFocusRef}
      onClose={onClose}
    >
      <p className="info-description">{VGA_2_INFO.description}</p>

      <section className="info-section">
        <h3>Basis &amp; metric</h3>
        <div className="info-table-scroll">
          <table className="algebra-grid">
            <thead><tr>{VGA_2_INFO.blades.map((blade) => <th key={blade}>{blade}</th>)}</tr></thead>
            <tbody><tr>{VGA_2_INFO.bladeSquares.map((square, index) => <td key={VGA_2_INFO.blades[index]}>{square}</td>)}</tr></tbody>
          </table>
        </div>
      </section>

      <section className="info-section">
        <h3>Cayley table</h3>
        <div className="info-table-scroll">
          <table className="algebra-grid cayley-grid">
            <thead><tr><th aria-label="left times right" />{VGA_2_INFO.blades.map((blade) => <th key={blade}>{blade}</th>)}</tr></thead>
            <tbody>
              {VGA_2_INFO.cayley.map((row, rowIndex) => (
                <tr key={VGA_2_INFO.blades[rowIndex]}>
                  <th scope="row">{VGA_2_INFO.blades[rowIndex]}</th>
                  {row.map((value, columnIndex) => <td key={VGA_2_INFO.blades[columnIndex]}>{value}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="info-section">
        <h3>Geometric interpretation</h3>
        <InfoTable rows={VGA_2_INFO.objects} />
      </section>

      <section className="info-section">
        <h3>Available operations</h3>
        <InfoTable rows={VGA_2_INFO.operations} />
      </section>

      <section className="info-section">
        <h3>Sub-algebras</h3>
        <InfoTable rows={VGA_2_INFO.subalgebras} />
      </section>

      <section className="info-section">
        <h3>Notes</h3>
        <ul>{VGA_2_INFO.notes.map((note) => <li key={note}>{note}</li>)}</ul>
      </section>
    </InfoDialog>
  )
}
