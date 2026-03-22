import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="container">
      <article className="essay">
        <h1>About</h1>
        <hr />
        <div className="essay-body">
          <p>
            I&rsquo;m Jon Litwack. I lead experience design at the intersection of
            data strategy and AI-powered development.
          </p>
          <p>
            For most of my career, I worked on the design side of a wall. I understood
            the problem better than most people in the room, but I couldn&rsquo;t touch
            the solution. I could describe it, sketch it, argue for it &mdash; then hand
            it off and hope the translation held.
          </p>
          <p>
            That wall is coming down. Code is becoming a shared medium &mdash; something
            designers, operators, and domain experts can work <em>in</em> together, the
            way musicians work in sound. I write about what happens when more perspectives
            can touch the material.
          </p>
          <p>
            These essays are where that thinking lives and grows.
          </p>
          <p style={{ marginTop: "2.5rem" }}>
            <a href="mailto:jon@jonlitwack.com">jon@jonlitwack.com</a>
            <span style={{ margin: "0 0.5rem", opacity: 0.4 }}>&middot;</span>
            <a
              href="https://linkedin.com/in/jonlitwack"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </a>
          </p>
        </div>
        <Link href="/" className="back-link">
          &larr; Essays
        </Link>
      </article>
    </div>
  );
}
