import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

const essaysDirectory = path.join(process.cwd(), "content/essays");

export interface Essay {
  slug: string;
  title: string;
  date: string;
  summary?: string;
  contentHtml: string;
}

export function getAllEssays(): Omit<Essay, "contentHtml">[] {
  const filenames = fs.readdirSync(essaysDirectory);
  const essays = filenames
    .filter((name) => name.endsWith(".md"))
    .map((filename) => {
      const slug = filename.replace(/\.md$/, "");
      const fullPath = path.join(essaysDirectory, filename);
      const fileContents = fs.readFileSync(fullPath, "utf8");
      const { data } = matter(fileContents);

      return {
        slug,
        title: data.title as string,
        date: data.date as string,
        summary: data.summary as string | undefined,
      };
    });

  return essays.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export async function getEssay(slug: string): Promise<Essay> {
  const fullPath = path.join(essaysDirectory, `${slug}.md`);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  const processedContent = await remark().use(html).process(content);
  const contentHtml = processedContent.toString();

  return {
    slug,
    title: data.title as string,
    date: data.date as string,
    summary: data.summary as string | undefined,
    contentHtml,
  };
}
