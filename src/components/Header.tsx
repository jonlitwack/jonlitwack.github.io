import Link from "next/link";

export default function Header() {
  return (
    <header className="site-header">
      <div className="container header-row">
        <Link href="/" className="wordmark">
          Jon Litwack
        </Link>
        <nav className="header-nav">
          <Link href="/">Writing</Link>
          <Link href="/about">About</Link>
        </nav>
      </div>
    </header>
  );
}
