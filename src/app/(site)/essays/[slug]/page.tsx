import Link from "next/link";
import { listEssays, getEssayWithHtml } from "@/lib/github";

export const revalidate = 60;

export async function generateStaticParams() {
  const essays = await listEssays();
  return essays.map((essay) => ({ slug: essay.slug }));
}

export default async function EssayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const essay = await getEssayWithHtml(slug);

  return (
    <article className="container essay">
      {essay.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={essay.image}
          alt={essay.title}
          className="essay-hero"
        />
      )}
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
