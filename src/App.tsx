import './App.css'

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <a
          className="app-title"
          href={import.meta.env.BASE_URL}
          aria-label="MultiVector home"
        >
          MultiVector
        </a>
        <span className="app-status">Research preview</span>
      </header>

      <main className="welcome">
        <section className="welcome-copy" aria-labelledby="welcome-title">
          <h1 id="welcome-title">
            Create, evaluate, and visualize multivector expressions
          </h1>
          <p className="welcome-summary">
            MultiVector is a research-driven environment for creating,
            evaluating, and visualizing reproducible geometric algebra
            constructions.
          </p>
          <p className="project-origin">
            MultiVector is an open-source project developed as part of PhD
            research in geometric algebra and scientific visualization.
          </p>
        </section>

        <section className="algebras" aria-label="Geometric algebra models">
          <article className="algebra-card">
            <p className="algebra-symbol">VGA</p>
            <h2>Vector geometric algebra</h2>
            <p>
              Euclidean vectors, products, and transformations in a
              dimension-parameterized algebra.
            </p>
          </article>

          <article className="algebra-card">
            <p className="algebra-symbol">PGA</p>
            <h2>Projective geometric algebra</h2>
            <p>
              Homogeneous models for points, lines, planes, and Euclidean
              transformations.
            </p>
          </article>

          <article className="algebra-card">
            <p className="algebra-symbol">CGA</p>
            <h2>Conformal geometric algebra</h2>
            <p>
              Conformal models for round geometry, incidence, and
              transformations.
            </p>
          </article>
        </section>
      </main>
    </div>
  )
}

export default App
