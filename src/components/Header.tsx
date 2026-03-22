import Link from "next/link";

export default function Header() {
  return (
    <header className="site-header">
      <div className="container">
        <Link href="/" className="wordmark">
          Jon Litwack — <em>writing</em>
        </Link>
      </div>
    </header>
  );
}
