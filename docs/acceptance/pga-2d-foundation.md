# PGA 2D Foundation Acceptance Record

- **Issue:** [#145](https://github.com/eharquin/multivector/issues/145)
- **Milestone:** [PGA 2D Foundation](../requirements/milestones/pga-2d-foundation.md)
- **Status:** In progress

This record tracks the evidence required to accept the first plane-based
PGA(2) workflow and, with it, the registered-algebra boundary. Automated
evidence is recorded as it lands; a criterion stays pending until its manual
and deployed evidence is complete where the milestone requires it.

## Acceptance matrix

| Criterion | Current evidence | Remaining evidence | Status |
| --- | --- | --- | --- |
| P2D-001 — Registered boundary | Registry resolving definition, interpretation, and visualizer (#148, #150, #151); no production import of a VGA or PGA module outside `src/algebra`, `src/geometry`, and `src/visualization` registrations; ALG-005 gate on restore and import (`algebraAvailability.test.ts`) | Review of `App.tsx` for algebra-specific branches on the release commit | Automated evidence ready |
| P2D-002 — Convention conformance | Every reference fixture replayed through the engine (`pgaEngine.test.ts`); PGA-004 parameterization cases (`pgaDefinition.test.ts`) | — | Automated evidence ready |
| P2D-003 — Language and diagnostics | Constructors, `inorm`, permuted blades, `ps`, operators, arity and domain diagnostics, VGA(2) unaffected (`pgaDefinition.test.ts`, `evaluateSource.test.ts`) | — | Automated evidence ready |
| P2D-004 — Interpretation | Entity identifiers, tolerance boundaries, projective descriptions, reflected weight, versor parity (`pga2Interpretation.test.ts`) | — | Automated evidence ready |
| P2D-005 — Visualization and manipulation | Point markers, clipped lines, direction markers, textual reporting, literal point dragging as one history entry, creation by double-click (`layout.test.ts`, `App.test.tsx`) | Deployed workflow on the supported browsers | Pending manual validation |
| P2D-006 — Document compatibility | PGA canonical round trip and 0.1.0 documents unchanged (`canonicalDocument.test.ts`, existing fixtures) | Reload of a 0.1.0 export on the deployed application | Pending manual validation |
| P2D-007 — Accessibility and release | — | Manual accessibility checklist, `npm run verify`, documented example on the deployed application | Pending |
| P2D-008 — Design feedback | — | Record confirmed, revised, and removed requirements | Pending |

## Manual workflow checklist

To be completed on the supported browsers of the 0.1.0 record with the
[PGA 2D Foundation example](../examples/pga-2d-foundation.md).

- [ ] Select PGA on an empty document; confirm the badge, the dialog tables,
  and that the select is disabled once the document has content.
- [ ] Build the documented example by keyboard and confirm every reported
  classification, position, weight, and equation.
- [ ] Confirm the drawn points, clipped lines, and edge direction marker, and
  the textual reporting of the rotor and of the line at infinity.
- [ ] Drag a literal point, undo the gesture as one entry, nudge it by keyboard,
  and create a point by double-click.
- [ ] Reload, export, and import the PGA document; open a 0.1.0 VGA export
  unchanged.
- [ ] Complete the accessibility checklist of the VGA 2D visual workflow record
  for the PGA workflow: keyboard only, focus, accessible names, 200 % zoom,
  reduced motion.

## Design feedback

Recorded at acceptance.
