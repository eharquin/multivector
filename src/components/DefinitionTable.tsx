type DefinitionTableProps = Readonly<{
  rows: readonly (readonly [string, string])[]
  /** Renders the term as a code chip. False for prose terms such as `Scalar`. */
  codeTerms?: boolean
}>

export function DefinitionTable({ rows, codeTerms = true }: DefinitionTableProps) {
  return (
    <table className="info-table">
      <tbody>
        {rows.map(([term, definition]) => (
          <tr key={term}>
            <th scope="row">{codeTerms ? <code>{term}</code> : term}</th>
            <td>{definition}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
