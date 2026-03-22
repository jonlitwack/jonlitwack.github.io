import Link from "next/link";
import { getAllEssays } from "@/lib/essays";

export default function Home() {
  const essays = getAllEssays();

  return (
    <div className="container">
      <section className="intro">
        <p className="tagline">
          Ideas about collaboration, code as a shared medium, and what happens
          when more people can touch the material.
        </p>
      </section>
      <ul className="essay-list">
        {essays.map((essay) => (
          <li key={essay.slug}>
            <Link href={`/essays/${essay.slug}`}>
              <span className="essay-title">{essay.title}</span>
              <span className="essay-date">
                {new Date(essay.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  timeZone: "UTC",
                })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
