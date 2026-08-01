# VGA 2D Foundation Example

This example exercises the complete foundation workflow using only the
keyboard. It uses two independently positioned vectors, a list that preserves
those positions, and a derived vector head.

## Build the document

1. Focus the first expression, replace its source with `s = 2`, and press
   `Enter`.
2. Enter `V1 = vector(s, 1)`. Press `Tab` past the normalization control to
   its position field, enter `(1, 1)`, return to the expression field with
   `Shift+Tab` through the same focus sequence, and press `Enter`.
3. Enter `V2 = vector(1, -1)`. Follow the same focus sequence to enter
   `(0.1, 0.1)`, return to the expression field, and press `Enter`.
4. Enter `L = [V1, V2]` and press `Enter`.
5. Enter `H = V1.head`.

The panel should report:

- `s` as scalar `2`;
- `V1` as vector `2e1 + e2` at position `(1, 1)`;
- `V2` as vector `e1 - e2` at position `(0.1, 0.1)`;
- `L` as a two-element list whose elements retain the positions of `V1`
  and `V2`;
- `H` as vector `3e1 + 2e2`, the head of `V1`.

The viewport should expose five visible vectors: the two declarations, the two
list elements, and the derived head when it has the standard origin position.

## Exercise diagnostics and recovery

1. Change `V2` to `V2 = vector(1)`.
2. Confirm that the expression field, error pastille, and textual diagnostic
   identify the invalid source and that stale output is absent.
3. Restore `V2 = vector(1, -1)`.
4. Confirm that its value, position, list element, and dependent viewport output
   recover immediately.

## Exercise appearance

1. Tab to the visibility control for `L` and toggle it twice.
2. Open its appearance control, choose another registered color, hide its
   visual label, and close the popover with `Escape`.
3. Confirm that focus returns predictably and that the list shares one
   appearance record while its two positions remain independent.

## Save, reload, export, and import

1. Reload the page and confirm that the same sources, positions, appearance,
   normalization settings, and theme return from local storage.
2. Activate `Export` and retain the downloaded `.multivector.json` file.
3. Change one source, activate `Import`, and select the exported file.
4. Confirm that the exported document is restored without losing document or
   item identities.

No pointer action is required by this workflow.
