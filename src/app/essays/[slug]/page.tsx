import Link from "next/link";
import { getAllEssays, getEssay } from "@/lib/essays";

export function generateStaticParams() {
  const essays = getAllEssays();
  return essays.map((essay) => ({ slug: essay.slug }));
}

export default async function EssayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const essay = await getEssay(slug);

  return (
    <article className="container essay">
      <h1>{essay.title}</h1>
      <time className="essay-meta">
        {new Date(essay.date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          timeZone: "UTC",
        })}
      </time>
      <hr />
      <div
        className="essay-body"
        dangerouslySetInnerHTML={{ __html: essay.contentHtml }}
      />
      <Link href="/" className="back-link">
        ← All essays
      </Link>
    </article>
  );
}
