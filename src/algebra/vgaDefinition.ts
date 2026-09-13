import { type AlgebraDefinition } from './algebraDefinition'
import { VGA_2_INFO } from './vga2Info'
import { createVga2Engine } from './vgaEngine'

/**
 * The built-in VGA definition. Version 1 fixes geometric dimension 2 and takes
 * no parameters (VGA-001 keeps the family dimension-parameterized; other
 * dimensions are activated by later definition versions).
 */
export const VGA_DEFINITION: AlgebraDefinition = Object.freeze({
  algebraId: 'org.multivector.vga',
  definitionVersion: 1,
  conventionVersions: [1],
  capabilities: new Set([
    'org.multivector.capability.constructor.vector',
    'org.multivector.capability.outer',
    'org.multivector.capability.inner',
    'org.multivector.capability.regressive',
    'org.multivector.capability.dual',
    'org.multivector.capability.reverse',
    'org.multivector.capability.grade-involution',
    'org.multivector.capability.inverse',
    'org.multivector.capability.power',
    'org.multivector.capability.sandwich',
    'org.multivector.capability.norm',
    'org.multivector.capability.normalize',
    'org.multivector.capability.exp',
    'org.multivector.capability.scalar-functions',
    'org.multivector.capability.pseudoscalar',
  ]),
  validateParameters(parameters) {
    const unknown = Object.keys(parameters)
    return unknown.length === 0
      ? { status: 'valid', parameters: {} }
      : { status: 'invalid', message: `unknown parameter “${unknown[0]}”.` }
  },
  createEngine() {
    return createVga2Engine()
  },
  info() {
    return VGA_2_INFO
  },
  standardInterpretationId: 'org.multivector.vga-2d',
  standardVisualizerId: 'org.multivector.vga-2d',
})
