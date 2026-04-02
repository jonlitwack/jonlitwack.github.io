import type { Metadata } from "next";
import Link from "next/link";
import { listEssays, getEssayWithHtml, getEssay } from "@/lib/github";
import { ChartHydrator } from "@/components/ChartHydrator";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const essay = await getEssay(slug);
  const description =
    essay.content.replace(/[#*_`>\[\]]/g, "").trim().slice(0, 160) + "…";
  const siteUrl = "https://jonlitwack.com";

  return {
    title: `${essay.title} — Jon Litwack`,
    description,
    openGraph: {
      title: essay.title,
      description,
      type: "article",
      url: `${siteUrl}/essays/${slug}`,
      ...(essay.image
        ? {
            images: [
              {
                url: `${siteUrl}${essay.image}`,
                width: 1200,
                height: 630,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: essay.image ? "summary_large_image" : "summary",
      title: essay.title,
      description,
      ...(essay.image ? { images: [`${siteUrl}${essay.image}`] } : {}),
    },
  };
}

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
      <ChartHydrator />
      <Link href="/" className="back-link">
        ← All essays
      </Link>
    </article>
  );
}
