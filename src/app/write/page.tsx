"use client";

import { useSession, signIn } from "next-auth/react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { marked } from "marked";
import {
  Bold, Italic, Heading1, Heading2, Heading3,
  Quote, List, ListOrdered, Link, Image,
  Code, FileCode, Minus, Sun, Moon, Pencil, Eye, ArrowLeft, Trash2,
} from "lucide-react";
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
type EditorMode = "edit" | "preview";

const ICON_SIZE = 18;

export default function WritePage() {
  const { data: session, status } = useSession();
  const [view, setView] = useState<View>("list");
  const [mode, setMode] = useState<EditorMode>("edit");
  const [essays, setEssays] = useState<EssayListItem[]>([]);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteContent, setPasteContent] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

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

  // Load theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("write-theme");
    if (saved === "light") setTheme("light");
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("write-theme", next);
  }

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
  }, [body, view, mode, autoResize]);

  // Load essay list
  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/essays")
        .then((r) => r.json())
        .then(setEssays)
        .catch(() => {});
    }
  }, [status]);

  // Preview HTML
  const previewHtml = useMemo(() => {
    if (mode !== "preview") return "";
    return marked(body, { async: false }) as string;
  }, [body, mode]);

  // Markdown insertion helper
  function insertMarkdown(
    type: "wrap" | "prefix" | "insert",
    before: string,
    after: string = ""
  ) {
    const textarea = bodyRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = body.substring(start, end);

    let newBody: string;
    let cursorPos: number;

    if (type === "wrap") {
      newBody = body.substring(0, start) + before + selected + after + body.substring(end);
      cursorPos = selected ? start + before.length + selected.length + after.length : start + before.length;
    } else if (type === "prefix") {
      // Find start of current line
      const lineStart = body.lastIndexOf("\n", start - 1) + 1;
      newBody = body.substring(0, lineStart) + before + body.substring(lineStart);
      cursorPos = start + before.length;
    } else {
      newBody = body.substring(0, start) + before + body.substring(end);
      cursorPos = start + before.length;
    }

    setBody(newBody);
    setStatusText("Unsaved");

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  }

  if (status === "loading") {
    return (
      <div className={styles.loading} data-theme={theme}>
        <span className={styles.loadingText}>Loading...</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={styles.loading} data-theme={theme}>
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
      setMode("edit");
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
    setMode("edit");
    setView("editor");
    setTimeout(() => titleRef.current?.focus(), 100);
  }

  // Parse markdown content and open in editor
  function loadMarkdownContent(content: string, filename?: string) {
    let parsedTitle = "";
    let parsedBody = content;

    const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
    if (fmMatch) {
      const frontmatter = fmMatch[1];
      parsedBody = fmMatch[2].trim();
      const titleMatch = frontmatter.match(/title:\s*["']?(.+?)["']?\s*$/m);
      if (titleMatch) parsedTitle = titleMatch[1];
    }

    if (!parsedTitle && filename) {
      parsedTitle = filename.replace(/\.(md|markdown|txt)$/, "").replace(/-/g, " ");
    }

    if (!parsedTitle) {
      const h1Match = parsedBody.match(/^#\s+(.+)$/m);
      if (h1Match) {
        parsedTitle = h1Match[1];
        parsedBody = parsedBody.replace(/^#\s+.+\n*/, "").trim();
      }
    }

    const newSlug = parsedTitle
      ? parsedTitle.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
      : "new-essay";

    setTitle(parsedTitle);
    setBody(parsedBody);
    setSlug(newSlug);
    setSha(undefined);
    setShowPaste(false);
    setPasteContent("");
    setStatusText("");
    setMode("edit");
    setView("editor");
  }

  // Publish
  async function publish() {
    if (!title.trim() || !body.trim()) return;

    const essaySlug =
      slug ||
      title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

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

  // Delete
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  async function deleteCurrentEssay() {
    if (!slug) return;

    setShowDeleteModal(false);
    setStatusText("Deleting...");
    try {
      const res = await fetch(`/api/essays/${slug}`, { method: "DELETE" });
      if (res.ok) {
        setStatusText("");
        setView("list");
        const listRes = await fetch("/api/essays");
        setEssays(await listRes.json());
      } else {
        const err = await res.json();
        setStatusText(`Error: ${err.error}`);
      }
    } catch {
      setStatusText("Error deleting");
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      loadMarkdownContent(ev.target?.result as string, file.name);
    };
    reader.readAsText(file);
  }

  // ——— RENDER ———

  if (view === "list") {
    return (
      <div className={styles.shell} data-theme={theme}>
        <div className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <span className={styles.topbarTitle}>Essays</span>
          </div>
          <button className={styles.themeToggle} onClick={toggleTheme} title="Toggle theme">
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
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
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // Editor view
  return (
    <div className={styles.shell} data-theme={theme}>
      <div className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <button className={styles.backArrow} onClick={() => setView("list")}>
            <ArrowLeft size={18} />
          </button>
          <span className={styles.topbarTitle}>
            {slug ? `${slug}.md` : "new-essay.md"}
          </span>
        </div>
        <div className={styles.topbarRight}>
          <div className={styles.modeToggle}>
            <button
              className={`${styles.modeBtn} ${mode === "edit" ? styles.modeActive : ""}`}
              onClick={() => setMode("edit")}
              title="Edit"
            >
              <Pencil size={14} />
            </button>
            <button
              className={`${styles.modeBtn} ${mode === "preview" ? styles.modeActive : ""}`}
              onClick={() => setMode("preview")}
              title="Preview"
            >
              <Eye size={14} />
            </button>
          </div>
          <button className={styles.themeToggle} onClick={toggleTheme} title="Toggle theme">
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {statusText && <span className={styles.status}>{statusText}</span>}
          {sha && (
            <button
              className={styles.deleteBtn}
              onClick={() => setShowDeleteModal(true)}
              title="Delete essay"
            >
              <Trash2 size={16} />
            </button>
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
          readOnly={mode === "preview"}
        />
        <div className={styles.dateDisplay}>
          {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </div>
        <hr className={styles.divider} />

        {mode === "edit" ? (
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
        ) : (
          <div
            className="essay-body"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        )}
      </div>

      {mode === "edit" && (
        <div className={styles.formatBar}>
          <button className={styles.formatBtn} onClick={() => insertMarkdown("wrap", "**", "**")} title="Bold">
            <Bold size={ICON_SIZE} />
          </button>
          <button className={styles.formatBtn} onClick={() => insertMarkdown("wrap", "*", "*")} title="Italic">
            <Italic size={ICON_SIZE} />
          </button>
          <div className={styles.formatSep} />
          <button className={styles.formatBtn} onClick={() => insertMarkdown("prefix", "# ")} title="Heading 1">
            <Heading1 size={ICON_SIZE} />
          </button>
          <button className={styles.formatBtn} onClick={() => insertMarkdown("prefix", "## ")} title="Heading 2">
            <Heading2 size={ICON_SIZE} />
          </button>
          <button className={styles.formatBtn} onClick={() => insertMarkdown("prefix", "### ")} title="Heading 3">
            <Heading3 size={ICON_SIZE} />
          </button>
          <div className={styles.formatSep} />
          <button className={styles.formatBtn} onClick={() => insertMarkdown("prefix", "> ")} title="Quote">
            <Quote size={ICON_SIZE} />
          </button>
          <button className={styles.formatBtn} onClick={() => insertMarkdown("prefix", "- ")} title="Bullet list">
            <List size={ICON_SIZE} />
          </button>
          <button className={styles.formatBtn} onClick={() => insertMarkdown("prefix", "1. ")} title="Numbered list">
            <ListOrdered size={ICON_SIZE} />
          </button>
          <div className={styles.formatSep} />
          <button className={styles.formatBtn} onClick={() => insertMarkdown("wrap", "[", "](url)")} title="Link">
            <Link size={ICON_SIZE} />
          </button>
          <button className={styles.formatBtn} onClick={() => insertMarkdown("insert", "![alt](/images/)")} title="Image">
            <Image size={ICON_SIZE} />
          </button>
          <button className={styles.formatBtn} onClick={() => insertMarkdown("wrap", "`", "`")} title="Inline code">
            <Code size={ICON_SIZE} />
          </button>
          <button className={styles.formatBtn} onClick={() => insertMarkdown("insert", "\n```\n\n```\n")} title="Code block">
            <FileCode size={ICON_SIZE} />
          </button>
          <button className={styles.formatBtn} onClick={() => insertMarkdown("insert", "\n---\n")} title="Horizontal rule">
            <Minus size={ICON_SIZE} />
          </button>
        </div>
      )}

      {showDeleteModal && (
        <div className={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <p className={styles.modalText}>
              Delete &ldquo;{title || slug}&rdquo;?
            </p>
            <p className={styles.modalHint}>This cannot be undone.</p>
            <div className={styles.modalActions}>
              <button
                className={styles.btnOutline}
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                className={styles.btnDelete}
                onClick={deleteCurrentEssay}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
