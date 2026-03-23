import { Octokit } from "@octokit/rest";
import { remark } from "remark";
import html from "remark-html";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const OWNER = "jonlitwack";
const REPO = "jonlitwack.github.io";
const ESSAYS_PATH = "content/essays";

export interface EssayFile {
  slug: string;
  title: string;
  date: string;
  image?: string;
  content: string;
  sha?: string;
}

export async function listEssays(): Promise<
  { slug: string; name: string }[]
> {
  const { data } = await octokit.repos.getContent({
    owner: OWNER,
    repo: REPO,
    path: ESSAYS_PATH,
  });

  if (!Array.isArray(data)) return [];

  return data
    .filter((f) => f.name.endsWith(".md"))
    .map((f) => ({
      slug: f.name.replace(/\.md$/, ""),
      name: f.name,
    }));
}

export async function getEssay(slug: string): Promise<EssayFile> {
  const { data } = await octokit.repos.getContent({
    owner: OWNER,
    repo: REPO,
    path: `${ESSAYS_PATH}/${slug}.md`,
  });

  if (Array.isArray(data) || data.type !== "file") {
    throw new Error("Not a file");
  }

  const content = Buffer.from(data.content, "base64").toString("utf8");

  // Parse frontmatter
  let title = slug;
  let date = "";
  let image: string | undefined;
  let body = content;

  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (fmMatch) {
    const frontmatter = fmMatch[1];
    body = fmMatch[2];
    const titleMatch = frontmatter.match(
      /title:\s*["']?(.+?)["']?\s*$/m
    );
    if (titleMatch) title = titleMatch[1];
    const dateMatch = frontmatter.match(/date:\s*(.+)$/m);
    if (dateMatch) date = dateMatch[1].trim();
    const imageMatch = frontmatter.match(/image:\s*["']?(.+?)["']?\s*$/m);
    if (imageMatch) image = imageMatch[1];
  }

  return { slug, title, date, image, content: body, sha: data.sha };
}

export async function getEssayWithHtml(slug: string): Promise<{
  title: string;
  date: string;
  image?: string;
  contentHtml: string;
}> {
  const essay = await getEssay(slug);
  const processed = await remark().use(html).process(essay.content);
  return {
    title: essay.title,
    date: essay.date,
    image: essay.image,
    contentHtml: processed.toString(),
  };
}

export async function listEssaysWithMeta(): Promise<
  { slug: string; title: string; date: string }[]
> {
  const files = await listEssays();
  const essays = await Promise.all(
    files.map(async (f) => {
      const essay = await getEssay(f.slug);
      return { slug: f.slug, title: essay.title, date: essay.date };
    })
  );
  return essays.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export async function deleteEssay(slug: string, sha: string): Promise<void> {
  await octokit.repos.deleteFile({
    owner: OWNER,
    repo: REPO,
    path: `${ESSAYS_PATH}/${slug}.md`,
    message: `Delete essay: ${slug}`,
    sha,
  });
}

export async function saveEssay(
  slug: string,
  title: string,
  date: string,
  body: string,
  sha?: string,
  image?: string
): Promise<void> {
  let frontmatter = `---\ntitle: "${title}"\ndate: ${date}\n`;
  if (image) frontmatter += `image: "${image}"\n`;
  frontmatter += `---\n\n`;
  const content = frontmatter + body;
  const encoded = Buffer.from(content).toString("base64");

  await octokit.repos.createOrUpdateFileContents({
    owner: OWNER,
    repo: REPO,
    path: `${ESSAYS_PATH}/${slug}.md`,
    message: sha ? `Update essay: ${title}` : `New essay: ${title}`,
    content: encoded,
    ...(sha ? { sha } : {}),
  });
}
