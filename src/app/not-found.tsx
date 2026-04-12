import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <Header />
      <main>
        <div className="container" style={{ paddingTop: "4rem", paddingBottom: "4rem" }}>
          <h1>Page not found</h1>
          <p style={{ color: "var(--muted)", marginTop: "1rem" }}>
            The page you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link href="/" className="back-link" style={{ marginTop: "2rem" }}>
            &larr; Back to essays
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
