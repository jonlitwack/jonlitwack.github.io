import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const OWNER = "jonlitwack";
const REPO = "jonlitwack.github.io";
const ESSAYS_PATH = "content/essays";

export interface EssayFile {
  slug: string;
  title: string;
  date: string;
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
  }

  return { slug, title, date, content: body, sha: data.sha };
}

export async function saveEssay(
  slug: string,
  title: string,
  date: string,
  body: string,
  sha?: string
): Promise<void> {
  const frontmatter = `---\ntitle: "${title}"\ndate: ${date}\n---\n\n`;
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
