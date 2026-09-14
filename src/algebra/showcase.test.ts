import { describe, expect, it } from 'vitest'
import { evaluateDocument } from '../application/evaluateDocument'
import { expressionDocument, showcaseItems } from '../document/expressionDocument'
import { executeDocumentCommand } from '../document/documentCommands'
import { createBuiltinAlgebraRegistry } from './builtinAlgebras'

describe('definition showcases', () => {
  const registry = createBuiltinAlgebraRegistry()

  for (const definition of registry.definitions()) {
    it(`${definition.badge}: every showcase row evaluates and the spatial ones draw`, () => {
      const validation = definition.validateParameters({})
      if (validation.status !== 'valid') throw new Error('invalid default parameters')
      const selected = executeDocumentCommand(expressionDocument([]), {
        kind: 'select-algebra',
        algebra: {
          algebraId: definition.algebraId,
          definitionVersion: definition.definitionVersion,
          conventionVersion: definition.conventionVersions[0],
          parameters: validation.parameters,
        },
        interpretation: { interpretationId: definition.standardInterpretationId, interpretationVersion: 1 },
        visualizerId: definition.standardVisualizerId,
      })
      const document = { ...selected.document, items: showcaseItems(definition.showcase) }
      const resolution = registry.resolve(document.algebra)
      const interpretation = registry.resolveInterpretation(document.interpretation)
      if (resolution.status !== 'resolved' || interpretation.status !== 'resolved') throw new Error('unresolved')
      const evaluated = evaluateDocument(document, { engine: resolution.engine, interpretation: interpretation.interpretation })
      const invalid = evaluated.filter((item) => item.evaluation?.status !== 'valid')
      expect(invalid.map((item) => item.item.source)).toEqual([])
      const drawn = evaluated.filter((item) => item.evaluation?.status === 'valid' && item.evaluation.valueType === 'single' && item.evaluation.primitive)
      expect(drawn.length).toBeGreaterThanOrEqual(2)
    })
  }

  it('PGA showcase classifies its rows as the documented kinds', () => {
    const definition = registry.definitions().find((candidate) => candidate.algebraId === 'org.multivector.pga')!
    const resolution = registry.resolve({ algebraId: 'org.multivector.pga', definitionVersion: 1, conventionVersion: 1, parameters: {} })
    const interpretation = registry.resolveInterpretation({ interpretationId: 'org.multivector.pga-2d', interpretationVersion: 1 })
    if (resolution.status !== 'resolved' || interpretation.status !== 'resolved') throw new Error('unresolved')
    const document = { ...expressionDocument(showcaseItems(definition.showcase)), algebra: { algebraId: 'org.multivector.pga', definitionVersion: 1, conventionVersion: 1, parameters: { dimension: 2 } } }
    const kinds = evaluateDocument(document, { engine: resolution.engine, interpretation: interpretation.interpretation })
      .map((item) => item.evaluation?.status === 'valid' && item.evaluation.valueType === 'single'
        ? interpretation.interpretation.describe(item.evaluation.entity) : '?')
    expect(kinds).toEqual([
      // At t = 0 the rotor is the scalar 1; it becomes a rotor as soon as the slider moves.
      'Point', 'Point', 'Line', 'Line', 'Point', 'Ideal point', 'Scalar', 'Scalar', 'Point', 'Translator', 'Point', 'Point',
    ])
  })
})
