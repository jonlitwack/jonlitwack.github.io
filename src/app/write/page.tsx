"use client";

import { useSession, signIn } from "next-auth/react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { marked } from "marked";
import { chartExtension } from "@/lib/chartExtension";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import {
  Bold, Italic, Heading1, Heading2, Heading3,
  Quote, List, ListOrdered, Link, Image,
  Code, FileCode, Minus, Sun, Moon, Pencil, Eye, ArrowLeft, Trash2, Upload,
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
  image?: string;
  content: string;
  sha?: string;
}

type View = "list" | "editor";
type EditorMode = "edit" | "preview";

marked.use({ extensions: [chartExtension] });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPreviewChartConfig(c: any) {
  const GRID = "rgba(255,255,255,0.06)";
  return {
    type: c.type,
    data: {
      labels: c.xLabels ?? c.datasets[0].data.map((_: unknown, i: number) => String(i)),
      datasets: c.datasets.map((ds: { label: string; data: (number | null)[]; color: string; width?: number; dash?: number[]; fill?: boolean }) => ({
        label: ds.label,
        data: ds.data,
        borderColor: ds.color,
        backgroundColor: ds.color + "1a",
        borderWidth: ds.width ?? 2.5,
        borderDash: ds.dash ?? [],
        fill: ds.fill ?? c.type === "bar",
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        spanGaps: false,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index" as const, intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#1a1a14",
          borderColor: "#2e2e28",
          borderWidth: 1,
          titleColor: "#e8e6df",
          bodyColor: "#9a9a8e",
          padding: 10,
          callbacks: {
            label: (ctx: { parsed: { y: number | null }; dataset: { label?: string } }) =>
              ctx.parsed.y === null ? "" : `  ${ctx.dataset.label ?? ""}: ${ctx.parsed.y}${c.ySuffix ?? ""}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: GRID },
          border: { display: false },
          ticks: {
            color: "#666660",
            font: { size: 11, family: "'IBM Plex Mono', monospace" },
            callback: (_: unknown, i: number) => (c.xLabels?.[i] ?? String(i)) + (c.xSuffix ?? ""),
          },
        },
        y: {
          min: c.yMin,
          max: c.yMax,
          grid: { color: GRID },
          border: { display: false },
          ticks: {
            color: "#666660",
            font: { size: 11, family: "'IBM Plex Mono', monospace" },
            callback: (v: unknown) => `${v}${c.ySuffix ?? ""}`,
          },
        },
      },
    },
  };
}

const ICON_SIZE = 18;

export default function WritePage() {
  const { data: session, status } = useSession();
  const [view, setView] = useState<View>("list");
  const [mode, setMode] = useState<EditorMode>("edit");
  const [essays, setEssays] = useState<EssayListItem[]>([]);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Editor state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [slug, setSlug] = useState("");
  const [sha, setSha] = useState<string | undefined>();
  const [heroImage, setHeroImage] = useState<string | undefined>();
  const [publishing, setPublishing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [heroChartPreviewUrl, setHeroChartPreviewUrl] = useState<string | undefined>();
  const [heroChartFullUrl, setHeroChartFullUrl] = useState<string | undefined>();
  const [heroChartRendering, setHeroChartRendering] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const heroChartBlobRef = useRef<string | undefined>(undefined);
  const heroChartFullRef = useRef<string | undefined>(undefined);

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const heroRef = useRef<HTMLInputElement>(null);

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

  // Upload an image file and return the URL
  async function uploadImage(file: File): Promise<string | null> {
    const formData = new FormData();
    formData.append("file", file);
    setStatusText("Uploading image...");
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const { url } = await res.json();
        setStatusText("");
        return url;
      }
      setStatusText("Upload failed");
      return null;
    } catch {
      setStatusText("Upload failed");
      return null;
    }
  }

  // Handle image toolbar button
  async function handleInlineImage() {
    imageRef.current?.click();
  }

  async function onInlineImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file);
    if (url) {
      insertMarkdown("insert", `![${file.name}](${url})`);
    }
    e.target.value = "";
  }

  // Handle hero image upload
  async function onHeroImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file);
    if (url) {
      setHeroImage(url);
      setStatusText("Unsaved");
    }
    e.target.value = "";
  }

  // Handle paste in body textarea — images or markdown with frontmatter
  function handleBodyPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;

    // Check for pasted images
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          uploadImage(file).then((url) => {
            if (url) {
              insertMarkdown("insert", `![image](${url})`);
            }
          });
        }
        return;
      }
    }

    // If body is empty and paste contains frontmatter, auto-parse it
    if (!body.trim()) {
      const text = e.clipboardData?.getData("text");
      if (text && text.trimStart().startsWith("---")) {
        e.preventDefault();
        loadMarkdownContent(text);
      }
    }
  }

  // Auto-resize textareas
  const autoResize = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    const scrollY = window.scrollY;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
    window.scrollTo(0, scrollY);
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

  // Detect which chart will become the hero image
  const heroChartTitle = useMemo(() => {
    if (heroImage) return null;
    const regex = /```chart\n([\s\S]*?)\n```/g;
    const charts: { title?: string; hero?: boolean }[] = [];
    let match;
    while ((match = regex.exec(body)) !== null) {
      try { charts.push(JSON.parse(match[1])); } catch { /* skip */ }
    }
    if (!charts.length) return null;
    const chosen = charts.find((c) => c.hero) ?? charts[0];
    return chosen.title || "Untitled chart";
  }, [body, heroImage]);

  // Auto-render hero chart image
  useEffect(() => {
    if (heroImage) {
      if (heroChartBlobRef.current) { URL.revokeObjectURL(heroChartBlobRef.current); heroChartBlobRef.current = undefined; }
      if (heroChartFullRef.current) { URL.revokeObjectURL(heroChartFullRef.current); heroChartFullRef.current = undefined; }
      setHeroChartPreviewUrl(undefined);
      setHeroChartFullUrl(undefined);
      return;
    }

    const chart = extractHeroChart();
    if (!chart) {
      setHeroChartPreviewUrl(undefined);
      setHeroChartFullUrl(undefined);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setHeroChartRendering(true);
      // Render full-size for cropping
      const fullBlob = await renderChartToBlob(chart, 1600, 1000);
      if (cancelled || !fullBlob) { setHeroChartRendering(false); return; }
      const fullUrl = URL.createObjectURL(fullBlob);
      if (heroChartFullRef.current) URL.revokeObjectURL(heroChartFullRef.current);
      heroChartFullRef.current = fullUrl;
      setHeroChartFullUrl(fullUrl);
      // Initially show the full render as preview (user can crop later)
      if (heroChartBlobRef.current) URL.revokeObjectURL(heroChartBlobRef.current);
      heroChartBlobRef.current = fullUrl;
      setHeroChartPreviewUrl(fullUrl);
      setHeroChartRendering(false);
    }, 800);

    return () => { cancelled = true; clearTimeout(timer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, heroImage]);

  // Preview HTML
  const previewHtml = useMemo(() => {
    if (mode !== "preview") return "";
    return marked(body, { async: false }) as string;
  }, [body, mode]);

  // Hydrate charts in preview
  useEffect(() => {
    if (mode !== "preview" || !previewHtml) return;
    const blocks = document.querySelectorAll<HTMLElement>(".chart-block[data-chart]");
    if (!blocks.length) return;

    import("chart.js/auto").then(({ default: Chart }) => {
      blocks.forEach((block) => {
        const id = block.dataset.chartId!;
        const canvas = document.getElementById(id) as HTMLCanvasElement | null;
        if (!canvas || canvas.dataset.hydrated) return;
        canvas.dataset.hydrated = "true";
        const config = JSON.parse(atob(block.dataset.chart!));
        new Chart(canvas, buildPreviewChartConfig(config));
      });
    });
  }, [mode, previewHtml]);

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
      setHeroImage(data.image || undefined);
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
    setHeroImage(undefined);
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
    setStatusText("");
    setMode("edit");
    setView("editor");
  }

  // Render a chart config to a PNG blob using an offscreen canvas
  async function renderChartToBlob(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config: any,
    width = 1600,
    height = 1000
  ): Promise<Blob | null> {
    const { default: Chart } = await import("chart.js/auto");

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const chartConfig = buildPreviewChartConfig(config);

    // Plugin to draw dark background (canvas is transparent by default)
    const bgPlugin = {
      id: "ogBackground",
      beforeDraw: (ch: { canvas: HTMLCanvasElement }) => {
        const ctx = ch.canvas.getContext("2d");
        if (!ctx) return;
        ctx.save();
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = "#161a1f";
        ctx.fillRect(0, 0, ch.canvas.width, ch.canvas.height);
        ctx.restore();
      },
    };

    const chart = new Chart(canvas, {
      ...chartConfig,
      plugins: [bgPlugin],
      options: {
        ...chartConfig.options,
        responsive: false,
        animation: false,
        devicePixelRatio: 2,
        plugins: {
          ...chartConfig.options.plugins,
          legend: {
            display: true,
            position: "bottom" as const,
            labels: {
              color: "#8a9098",
              font: { size: 11, family: "'IBM Plex Mono', monospace" },
              padding: 16,
              usePointStyle: true,
              pointStyleWidth: 16,
            },
          },
          title: config.title ? {
            display: true,
            text: config.title.toUpperCase(),
            color: "#8a9098",
            font: { size: 13, weight: "normal" as const, family: "'IBM Plex Mono', monospace" },
            padding: { top: 10, bottom: 20 },
            align: "start" as const,
          } : { display: false },
          subtitle: config.source ? {
            display: true,
            text: config.source,
            color: "#555550",
            font: { size: 10, family: "'IBM Plex Mono', monospace" },
            padding: { top: 8, bottom: 0 },
            align: "start" as const,
          } : { display: false },
        },
      },
    });

    // Wait for render
    await new Promise((r) => setTimeout(r, 200));

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        chart.destroy();
        resolve(blob);
      }, "image/png");
    });
  }

  // Crop an image blob to the specified area, output at 1200x630
  async function cropImage(sourceUrl: string, area: Area): Promise<Blob | null> {
    const img = new window.Image();
    img.src = sourceUrl;
    await new Promise((r) => { img.onload = r; });

    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(
      img,
      area.x, area.y, area.width, area.height,
      0, 0, 1200, 630
    );

    return new Promise((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });
  }

  // Extract the hero chart from the body (matching server-side logic)
  function extractHeroChart() {
    const regex = /```chart\n([\s\S]*?)\n```/g;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const charts: any[] = [];
    let match;
    while ((match = regex.exec(body)) !== null) {
      try { charts.push(JSON.parse(match[1])); } catch { /* skip */ }
    }
    if (!charts.length) return null;
    return charts.find((c) => c.hero) ?? charts[0];
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
      // Upload chart hero image if one was rendered
      let publishImage = heroImage;
      if (!publishImage && heroChartPreviewUrl) {
        setStatusText("Uploading preview image...");
        const res2 = await fetch(heroChartPreviewUrl);
        const blob = await res2.blob();
        if (blob) {
          const formData = new FormData();
          formData.append("file", blob, `og-${essaySlug}.png`);
          const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
          if (uploadRes.ok) {
            const { url } = await uploadRes.json();
            publishImage = url;
          }
        }
      }

      setStatusText("Publishing...");
      const res = await fetch("/api/essays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: essaySlug,
          title: title.trim(),
          date: new Date().toISOString(),
          body: body.trim(),
          sha,
          image: publishImage,
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
              <button className={styles.btnOutline} onClick={openNew}>
                + New
              </button>
            </div>
          </div>

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
        {/* Preview mode: hero image as it appears on the public page */}
        {mode === "preview" && (heroImage || heroChartPreviewUrl) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroImage ?? heroChartPreviewUrl}
            alt={title}
            className={styles.previewHero}
          />
        )}

        {/* Edit mode: hero upload zone */}
        {mode === "edit" && (
          <>
            <div
              className={styles.heroZone}
              onClick={() => heroRef.current?.click()}
            >
              {heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={heroImage} alt="Hero" className={styles.heroPreview} />
              ) : heroChartPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroChartPreviewUrl}
                  alt={heroChartTitle ?? "Chart"}
                  className={styles.heroPreview}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (heroChartFullUrl) {
                      setCropPosition({ x: 0, y: 0 });
                      setCropZoom(1);
                      setShowCropModal(true);
                    }
                  }}
                />
              ) : heroChartRendering ? (
                <span className={styles.heroRendering}>
                  Rendering preview&hellip;
                </span>
              ) : (
                <span className={styles.heroPlaceholder}>
                  <Image size={20} /> Add hero image
                </span>
              )}
            </div>
            {heroImage && (
              <button
                className={styles.heroRemove}
                onClick={() => { setHeroImage(undefined); setStatusText("Unsaved"); }}
              >
                Remove hero image
              </button>
            )}
            {!heroImage && heroChartTitle && (
              <div className={styles.heroAutoLabel}>
                <span className={styles.heroAutoDot} />
                {heroChartPreviewUrl ? "Tap image to crop" : `Auto: "${heroChartTitle}"`}
                <span className={styles.heroAutoHint}>
                  &middot; Add <code>&quot;hero&quot;: true</code> to choose a different chart
                </span>
              </div>
            )}
          </>
        )}
        <input
          ref={heroRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={onHeroImageSelected}
        />

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
            onPaste={handleBodyPaste}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                e.preventDefault();
                const start = e.currentTarget.selectionStart;
                const end = e.currentTarget.selectionEnd;
                const newBody = body.substring(0, start) + "  " + body.substring(end);
                setBody(newBody);
                setStatusText("Unsaved");
                setTimeout(() => {
                  if (bodyRef.current) {
                    bodyRef.current.selectionStart = bodyRef.current.selectionEnd = start + 2;
                  }
                }, 0);
              }
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
          <button className={styles.formatBtn} onClick={handleInlineImage} title="Image">
            <Image size={ICON_SIZE} />
          </button>
          <input
            ref={imageRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={onInlineImageSelected}
          />
          <button className={styles.formatBtn} onClick={() => insertMarkdown("wrap", "`", "`")} title="Inline code">
            <Code size={ICON_SIZE} />
          </button>
          <button className={styles.formatBtn} onClick={() => insertMarkdown("insert", "\n```\n\n```\n")} title="Code block">
            <FileCode size={ICON_SIZE} />
          </button>
          <button className={styles.formatBtn} onClick={() => insertMarkdown("insert", "\n---\n")} title="Horizontal rule">
            <Minus size={ICON_SIZE} />
          </button>
          <div className={styles.formatSep} />
          <button className={styles.formatBtn} onClick={() => fileRef.current?.click()} title="Import .md file">
            <Upload size={ICON_SIZE} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".md,.markdown,.txt"
            style={{ display: "none" }}
            onChange={handleFileUpload}
          />
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

      {showCropModal && heroChartFullUrl && (
        <div className={styles.modalOverlay} onClick={() => setShowCropModal(false)}>
          <div className={styles.cropModal} onClick={(e) => e.stopPropagation()}>
            <p className={styles.modalText}>Crop preview image</p>
            <div className={styles.cropContainer}>
              <Cropper
                image={heroChartFullUrl}
                crop={cropPosition}
                zoom={cropZoom}
                minZoom={0.3}
                maxZoom={3}
                aspect={1200 / 630}
                objectFit="contain"
                onCropChange={setCropPosition}
                onZoomChange={setCropZoom}
                onCropComplete={(_, area) => setCroppedArea(area)}
                style={{
                  containerStyle: { background: "#161a1f" },
                }}
              />
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.btnOutline}
                onClick={() => setShowCropModal(false)}
              >
                Cancel
              </button>
              <button
                className={styles.btnPublish}
                onClick={async () => {
                  if (!croppedArea) return;
                  const cropped = await cropImage(heroChartFullUrl, croppedArea);
                  if (cropped) {
                    const url = URL.createObjectURL(cropped);
                    if (heroChartBlobRef.current && heroChartBlobRef.current !== heroChartFullRef.current) {
                      URL.revokeObjectURL(heroChartBlobRef.current);
                    }
                    heroChartBlobRef.current = url;
                    setHeroChartPreviewUrl(url);
                  }
                  setShowCropModal(false);
                }}
              >
                Apply crop
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
