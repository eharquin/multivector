import type { RefObject } from 'react'
import { VGA_2_INFO } from '../algebra/vga2Info'
import { DEFAULT_OBJECT_STYLES, paletteEntry } from './appearancePalette'
import { DefinitionTable } from './DefinitionTable'
import { InfoDialog } from './InfoDialog'

type AlgebraInfoDialogProps = Readonly<{
  returnFocusRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
}>

/**
 * Documents the presentation defaults applied to items without stored
 * appearance. Colour is decorative here: the palette name carries the identity
 * so the section survives greyscale and assistive technology (A11Y-002).
 */
function ObjectColorTable() {
  return (
    <table className="info-table">
      <tbody>
        {DEFAULT_OBJECT_STYLES.map(([kind, style]) => {
          const entry = paletteEntry(style)
          return (
            <tr key={kind}>
              <th scope="row">
                <span
                  className="object-color-swatch"
                  style={{ backgroundColor: entry?.hex }}
                  aria-hidden="true"
                />
                {kind}
              </th>
              <td title={entry?.hex}>{entry?.name}</td>
            </tr>
          )
        })}
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
        <DefinitionTable rows={VGA_2_INFO.objects} codeTerms={false} />
      </section>

      <section className="info-section">
        <h3>Object colors</h3>
        <ObjectColorTable />
        <p className="info-footnote">
          Defaults. Any item can override its color from the appearance popover
          in the expression panel.
        </p>
      </section>

      <section className="info-section">
        <h3>Available operations</h3>
        <DefinitionTable rows={VGA_2_INFO.operations} />
      </section>

      <section className="info-section">
        <h3>Sub-algebras</h3>
        <DefinitionTable rows={VGA_2_INFO.subalgebras} codeTerms={false} />
      </section>

      <section className="info-section">
        <h3>Notes</h3>
        <ul>{VGA_2_INFO.notes.map((note) => <li key={note}>{note}</li>)}</ul>
      </section>
    </InfoDialog>
  )
}
