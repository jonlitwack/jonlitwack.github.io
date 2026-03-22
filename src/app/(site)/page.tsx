import Link from "next/link";
import { listEssaysWithMeta } from "@/lib/github";

export const revalidate = 60;

export default async function Home() {
  const essays = await listEssaysWithMeta();

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
