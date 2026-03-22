"use client";

import { useSession, signIn } from "next-auth/react";
import { useState, useEffect, useRef, useCallback } from "react";
import styles from "./write.module.css";

interface EssayListItem {
  slug: string;
  name: string;
}

interface EssayData {
  slug: string;
  title: string;
  date: string;
  content: string;
  sha?: string;
}

type View = "list" | "editor";

export default function WritePage() {
  const { data: session, status } = useSession();
  const [view, setView] = useState<View>("list");
  const [essays, setEssays] = useState<EssayListItem[]>([]);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteContent, setPasteContent] = useState("");

  // Editor state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [slug, setSlug] = useState("");
  const [sha, setSha] = useState<string | undefined>();
  const [publishing, setPublishing] = useState(false);
  const [statusText, setStatusText] = useState("");

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const pasteRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Auto-resize textareas
  const autoResize = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, []);

  useEffect(() => {
    autoResize(titleRef.current);
  }, [title, view, autoResize]);

  useEffect(() => {
    autoResize(bodyRef.current);
  }, [body, view, autoResize]);

  // Load essay list
  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/essays")
        .then((r) => r.json())
        .then(setEssays)
        .catch(() => {});
    }
  }, [status]);

  if (status === "loading") {
    return (
      <div className={styles.loading}>
        <span className={styles.loadingText}>Loading...</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={styles.loading}>
        <button className={styles.btnPublish} onClick={() => signIn("github")}>
          Sign in with GitHub
        </button>
      </div>
    );
  }

  // Open an existing essay
  async function openEssay(essaySlug: string) {
    try {
      const res = await fetch(`/api/essays/${essaySlug}`);
      const data: EssayData = await res.json();
      setTitle(data.title);
      setBody(data.content);
      setSlug(data.slug);
      setSha(data.sha);
      setStatusText("");
      setView("editor");
    } catch {
      setStatusText("Error loading essay");
    }
  }

  // Open a blank editor
  function openNew() {
    setTitle("");
    setBody("");
    setSlug("");
    setSha(undefined);
    setStatusText("");
    setView("editor");
    setTimeout(() => titleRef.current?.focus(), 100);
  }

  // Parse markdown content and open in editor
  function loadMarkdownContent(content: string, filename?: string) {
    let parsedTitle = "";
    let parsedBody = content;

    // Parse frontmatter
    const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
    if (fmMatch) {
      const frontmatter = fmMatch[1];
      parsedBody = fmMatch[2].trim();
      const titleMatch = frontmatter.match(
        /title:\s*["']?(.+?)["']?\s*$/m
      );
      if (titleMatch) parsedTitle = titleMatch[1];
    }

    // Fallback: filename
    if (!parsedTitle && filename) {
      parsedTitle = filename
        .replace(/\.(md|markdown|txt)$/, "")
        .replace(/-/g, " ");
    }

    // Fallback: first H1
    if (!parsedTitle) {
      const h1Match = parsedBody.match(/^#\s+(.+)$/m);
      if (h1Match) {
        parsedTitle = h1Match[1];
        parsedBody = parsedBody.replace(/^#\s+.+\n*/, "").trim();
      }
    }

    const newSlug = parsedTitle
      ? parsedTitle
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "")
      : "new-essay";

    setTitle(parsedTitle);
    setBody(parsedBody);
    setSlug(newSlug);
    setSha(undefined);
    setShowPaste(false);
    setPasteContent("");
    setStatusText("");
    setView("editor");
  }

  // Publish
  async function publish() {
    if (!title.trim() || !body.trim()) return;

    const essaySlug =
      slug ||
      title
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

    setPublishing(true);
    setStatusText("Publishing...");

    try {
      const res = await fetch("/api/essays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: essaySlug,
          title: title.trim(),
          date: new Date().toISOString(),
          body: body.trim(),
          sha,
        }),
      });

      if (res.ok) {
        setStatusText("Published");
        setSlug(essaySlug);
        // Refresh essay list
        const listRes = await fetch("/api/essays");
        setEssays(await listRes.json());
      } else {
        const err = await res.json();
        setStatusText(`Error: ${err.error}`);
      }
    } catch {
      setStatusText("Error publishing");
    } finally {
      setPublishing(false);
    }
  }

  // Handle file upload
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      loadMarkdownContent(ev.target?.result as string, file.name);
    };
    reader.readAsText(file);
  }

  // Format date for display
  function formatDate(slug: string) {
    // Read from the essay list — we don't have dates in the list API
    // Just show the slug for now
    return "";
  }

  // ——— RENDER ———

  if (view === "list") {
    return (
      <div className={styles.shell}>
        <div className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <span className={styles.topbarTitle}>Essays</span>
          </div>
          <div />
        </div>

        <div className={styles.container}>
          <div className={styles.listHeader}>
            <span className={styles.listTitle}>Essays</span>
            <div className={styles.listActions}>
              <button
                className={styles.btnOutline}
                onClick={() => {
                  setShowPaste(!showPaste);
                  setTimeout(() => pasteRef.current?.focus(), 100);
                }}
              >
                + Paste / Import
              </button>
              <button className={styles.btnOutline} onClick={openNew}>
                + New
              </button>
            </div>
          </div>

          {showPaste && (
            <div className={styles.pasteZone}>
              <textarea
                ref={pasteRef}
                className={styles.pasteArea}
                placeholder="Paste Markdown from Claude here..."
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
              />
              <div className={styles.pasteActions}>
                <span className={styles.pasteHint}>
                  or{" "}
                  <span onClick={() => fileRef.current?.click()}>
                    browse for a .md file
                  </span>
                </span>
                <button
                  className={styles.btnLoad}
                  disabled={!pasteContent.trim()}
                  onClick={() => loadMarkdownContent(pasteContent)}
                >
                  Open in editor →
                </button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".md,.markdown,.txt"
                style={{ display: "none" }}
                onChange={handleFileUpload}
              />
            </div>
          )}

          <ul className={styles.essayList}>
            {essays.map((essay) => (
              <li key={essay.slug} onClick={() => openEssay(essay.slug)}>
                <span className={styles.essayTitle}>
                  {essay.slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
                <span className={styles.essayDate}>{formatDate(essay.slug)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // Editor view
  return (
    <div className={styles.shell}>
      <div className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <button
            className={styles.backArrow}
            onClick={() => setView("list")}
          >
            ←
          </button>
          <span className={styles.topbarTitle}>
            {slug ? `${slug}.md` : "new-essay.md"}
          </span>
        </div>
        <div className={styles.topbarRight}>
          {statusText && (
            <span className={styles.status}>{statusText}</span>
          )}
          <button
            className={styles.btnPublish}
            onClick={publish}
            disabled={publishing || !title.trim() || !body.trim()}
          >
            {publishing ? "Publishing..." : "Publish"}
          </button>
        </div>
      </div>

      <div className={styles.editorContainer}>
        <textarea
          ref={titleRef}
          className={styles.titleInput}
          placeholder="Essay title"
          rows={1}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setStatusText("Unsaved");
          }}
        />
        <div className={styles.dateDisplay}>
          {new Date().toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </div>
        <hr className={styles.divider} />
        <textarea
          ref={bodyRef}
          className={styles.bodyEditor}
          placeholder="Start writing..."
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setStatusText("Unsaved");
          }}
        />
      </div>

      <div className={styles.formatBar}>
        <button className={styles.formatBtn}><b>B</b></button>
        <button className={styles.formatBtn}><i>I</i></button>
        <button className={`${styles.formatBtn} ${styles.accent}`}><i>em</i></button>
        <div className={styles.formatSep} />
        <button className={styles.formatBtn}>H2</button>
        <button className={styles.formatBtn}>❝</button>
        <button className={styles.formatBtn}>—</button>
        <button className={styles.formatBtn}>🔗</button>
        <div className={styles.formatSep} />
        <button className={styles.formatBtn}>📷</button>
        <button className={styles.formatBtn}>───</button>
      </div>
    </div>
  );
}
