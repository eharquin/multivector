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
| P2D-001 — Registered boundary | Registry resolving definition, interpretation, and visualizer (#148, #150, #151); no production import of a VGA or PGA module outside `src/algebra`, `src/geometry`, and `src/visualization` registrations; ALG-005 gate on restore and import (`algebraAvailability.test.ts`); `App.tsx` review on `047cd05` (see below): no algebra-specific branch, one deferred first-run default (#217) | Repeat the review on the accepted commit | Review complete; deferral linked |
| P2D-002 — Convention conformance | Every reference fixture replayed through the engine (`pgaEngine.test.ts`); PGA-004 parameterization cases (`pgaDefinition.test.ts`) | — | Automated evidence ready |
| P2D-003 — Language and diagnostics | Constructors, `inorm`, permuted blades, `ps`, operators, arity and domain diagnostics, VGA(2) unaffected (`pgaDefinition.test.ts`, `evaluateSource.test.ts`) | — | Automated evidence ready |
| P2D-004 — Interpretation | Entity identifiers, tolerance boundaries, projective descriptions, reflected weight, versor parity (`pga2Interpretation.test.ts`) | — | Automated evidence ready |
| P2D-005 — Visualization and manipulation | Point markers, clipped lines, ideal points as positioned arrows or edge markers (#157), textual reporting, literal point dragging as one history entry, creation by double-click, connected point lists with rays to ideal points (#205), list `position` and `head` (#207) (`layout.test.ts`, `App.test.tsx`, `evaluateDocument.test.ts`) | Deployed workflow on the supported browsers | Pending manual validation |
| P2D-006 — Document compatibility | PGA canonical round trip and 0.1.0 documents unchanged (`canonicalDocument.test.ts`, existing fixtures) | Reload of a 0.1.0 export on the deployed application | Pending manual validation |
| P2D-007 — Accessibility and release | `npm run verify` passed on `047cd05` (typecheck, lint, 642 tests, build); appearance menu kept inside the window, including at 200 % zoom on a short window (#211) | `npm run verify` on the accepted commit; manual accessibility checklist and documented example on the deployed application | Pending manual validation |
| P2D-008 — Design feedback | — | Record confirmed, revised, and removed requirements | Pending |

## P2D-001 review of `App.tsx`

Reviewed on `047cd05` for branches that select behavior by algebra rather than
through the registered definition, interpretation, and visualizer.

- `App.tsx` imports no module from `src/algebra/*Definition`, `*Engine`, or
  `src/geometry/*Interpretation`; algebras are resolved through
  `algebraRegistry` and selected by `document.algebra`.
- The only algebra identifier comparison selects a registered definition by id
  (`selectAlgebra`).
- Rendering branches on visualization primitive kinds (`point-marker`,
  `unbounded-line`, `ideal-point`, `line-at-infinity`, `oriented-segment`,
  `oriented-area`), the algebra-independent boundary, and on the generic
  `scalar` entity for numeric controls.
- **Deferred:** the first-run document is built with
  `vga2FoundationExampleDocument()`, which duplicates the VGA definition's
  showcase. It is a default document, not an algebra branch; building it from
  the default definition's showcase is tracked by
  [#217](https://github.com/eharquin/multivector/issues/217).

## Blocking issues

Issue #192 requires these issues to be fixed or dispositioned before
acceptance.

| Issue | Disposition |
| --- | --- |
| [#188](https://github.com/eharquin/multivector/issues/188) Appearance menu clipped at the window edge | Fixed by #211; the style rework moves to [#216](https://github.com/eharquin/multivector/issues/216), which does not block acceptance |
| [#189](https://github.com/eharquin/multivector/issues/189) Slider controls on computed scalars | Fixed by #210 |
| [#195](https://github.com/eharquin/multivector/issues/195) Scalar animation bounds | Fixed by #196 |
| [#197](https://github.com/eharquin/multivector/issues/197) Scalar modulo | Fixed by #198 |
| [#199](https://github.com/eharquin/multivector/issues/199) Concurrent scalar playback | Fixed by #201 |

## Manual workflow checklist

To be completed on the supported browsers of the 0.1.0 record with the
[PGA 2D Foundation example](../examples/pga-2d-foundation.md).

- [ ] Select PGA from the header capsule menu; confirm the badge and the
  algebra information dialog, that a document with content asks for
  confirmation and is replaced by the PGA example, and that one undo restores
  the previous document and algebra.
- [ ] Build the documented example by keyboard and confirm every reported
  classification, position, weight, and equation.
- [ ] Confirm the drawn points and clipped lines, an ideal point as a
  positioned arrow and as an edge marker (appearance *Display*), and the
  textual reporting of the rotor and of the line at infinity.
- [ ] Drag a literal point, undo the gesture as one entry, nudge it by keyboard,
  and create a point by double-click.
- [ ] Connect a point list as an open polyline and as a closed loop, including
  a list with an ideal point, and hide its markers.
- [ ] Open the appearance menu from the first and the last row on a short
  window and after scrolling the expression list; every section stays
  reachable.
- [ ] Reload, export, and import the PGA document; open a 0.1.0 VGA export
  unchanged.
- [ ] Complete the accessibility checklist of the VGA 2D visual workflow record
  for the PGA workflow: keyboard only, focus, accessible names, 200 % zoom,
  reduced motion.

## Design feedback

Recorded at acceptance.
