# PGA 2D Foundation Example

This example exercises the plane-based PGA(2) workflow using the keyboard and
one pointer gesture. It builds two points, the line through them, the meet of
that line with a fixed line, an ideal point, and a motor acting on a point.

## Select the algebra

1. Start from an empty document: clear every expression, or use a new browser
   session and delete the example rows.
2. Activate the `VGA · 2D` badge in the header. In the *Document algebra*
   select, choose `PGA · 2D — Projective Geometric Algebra` and close the
   dialog with `Escape`. The badge now reads `PGA · 2D`.

The algebra of a document with content cannot be changed; the select is
disabled until the document is empty.

## Build the document

1. Focus the first expression, enter `P = point(1, 2)`, and press `Enter`.
2. Enter `Q = point(-2, 1)` and press `Enter`.
3. Enter `J = P & Q` and press `Enter`: the join is the line through `P` and
   `Q`.
4. Enter `L = line(1, -1, 0)` and press `Enter`: the line `x − y = 0`.
5. Enter `M = J ^ L` and press `Enter`: the meet is the point common to both
   lines.
6. Enter `D = ipoint(1, 1)` and press `Enter`: the ideal point in direction
   `(1, 1)`.
7. Enter `R = exp(-(pi/4) e12)` and press `Enter`: the rotor for a quarter turn
   about the origin.
8. Enter `S = R >>> P`.

The panel should report:

- `P` as `Point at (1, 2)` and `Q` as `Point at (-2, 1)`;
- `J` as `Line 0.316228x − 0.948683y + 1.58114 = 0, scale 3.16228`;
- `L` as `Line 0.707107x − 0.707107y = 0, scale 1.41421`;
- `M` as `Point at (2.5, 2.5), weight 2` — the meet carries the weight
  produced by the two lines' coefficients;
- `D` as `Ideal point direction (1, 1)`;
- `R` as `Rotor`;
- `S` as `Point at (-2, 1)`, the quarter-turn image of `P`.

The viewport shows the two points as markers, the two lines clipped to the
viewport, the meet as a third marker, and the ideal point as an arrow at the
viewport edge in direction `(1, 1)`. The rotor has no drawn form and is
reported textually.

## Exercise projective equivalence and versors

1. Change `Q` to `Q = 2 point(-2, 1)`: it reports `Point at (-2, 1), weight 2`;
   the join and the meet are unchanged as geometry.
2. Enter `F = e1 >>> P`: the reflection of `P` in the y axis reports
   `Point at (-1, 2), weight -1`. The negative weight is the orientation
   reversal of an odd versor, not an error.
3. Enter `T = 1 - 1.5 e01`: a `Translator`; `T >>> P` is `Point at (4, 2)`.

## Move a point directly

1. Hover the marker of `P` and drag it: `P = point(x, y)` is rewritten with
   the pointer's grid-rounded coordinates, and `J`, `M`, and `S` follow.
2. Press `Ctrl+Z` (`⌘Z` on macOS): the whole gesture is undone as one entry.
3. Focus the marker of `P` with `Tab` and press the arrow keys to nudge it
   (`Shift` for a larger step).

Lines and ideal points have no handle in this milestone.

## Create points from the viewport

Double-click empty viewport space: a new declaration `P1 = point(x, y)` is
inserted with the pointer's coordinates and focused.

## Save, reload, export, and import

1. Reload the page: the algebra, interpretation, sources, and appearance return
   from local storage, and the badge still reads `PGA · 2D`.
2. Export the document and re-import it: the algebra record `org.multivector.pga`
   with `{ "dimension": 2 }`, the interpretation `org.multivector.pga-2d`, and
   the visualizer are preserved.
3. Open a VGA document exported earlier: it loads unchanged.
