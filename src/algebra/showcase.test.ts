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
      'Point', 'Point', 'Point', 'Line', 'Line', 'Scalar', 'Scalar', 'Scalar', 'Scalar', 'Scalar', 'Scalar', 'Line', 'Scalar',
    ])
  })

  it('PGA showcase reads the documented distances, angles, height, and area', () => {
    const definition = registry.definitions().find((candidate) => candidate.algebraId === 'org.multivector.pga')!
    const resolution = registry.resolve({ algebraId: 'org.multivector.pga', definitionVersion: 1, conventionVersion: 1, parameters: {} })
    const interpretation = registry.resolveInterpretation({ interpretationId: 'org.multivector.pga-2d', interpretationVersion: 1 })
    if (resolution.status !== 'resolved' || interpretation.status !== 'resolved') throw new Error('unresolved')
    const document = { ...expressionDocument(showcaseItems(definition.showcase)), algebra: { algebraId: 'org.multivector.pga', definitionVersion: 1, conventionVersion: 1, parameters: { dimension: 2 } } }
    const scalars = new Map(evaluateDocument(document, { engine: resolution.engine, interpretation: interpretation.interpretation })
      .flatMap((item) => item.evaluation?.status === 'valid' && item.evaluation.valueType === 'single'
        ? [[item.item.source.split(' = ')[0], item.evaluation.value.coefficients[0]] as const] : []))
    expect(scalars.get('dAB')).toBeCloseTo(Math.hypot(4, 1), 12)
    expect(scalars.get('dBC')).toBeCloseTo(Math.hypot(1, 4), 12)
    // From AB, direction (4, 1), to AC, direction (3, -3): clockwise, about -59°.
    expect(scalars.get('alpha')).toBeCloseTo(Math.atan2(-3, 3) - Math.atan2(1, 4), 12)
    expect(scalars.get('deg')).toBeCloseTo(-59.0362, 3)
    // C lies on the negative side of L = -x + 4y - 6, 15 / √17 away.
    expect(scalars.get('hC')).toBeCloseTo(-15 / Math.sqrt(17), 12)
    // A, B, C run clockwise, so the signed area is negative.
    expect(scalars.get('area')).toBeCloseTo(-7.5, 12)
    // From L, normal (-1, 4), to the vertical line x = 1, normal (1, 0): cos = -1, sin = -4.
    expect(scalars.get('beta')).toBeCloseTo(Math.atan2(-4, -1), 12)
  })
})
