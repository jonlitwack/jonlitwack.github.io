import { type TokenizerExtension, type RendererExtension } from "marked";

export const chartExtension: TokenizerExtension & RendererExtension = {
  name: "chart",
  level: "block",
  start(src: string) {
    return src.indexOf("```chart");
  },
  tokenizer(src: string) {
    const match = src.match(/^```chart\n([\s\S]*?)\n```/);
    if (match) {
      return {
        type: "chart",
        raw: match[0],
        json: match[1],
      };
    }
  },
  renderer(token) {
    const t = token as unknown as { json: string };
    let config: {
      title?: string;
      source?: string;
      height?: number;
      [key: string]: unknown;
    };
    try {
      config = JSON.parse(t.json);
    } catch {
      return `<div class="chart-error">Chart JSON invalid</div>`;
    }

    const id = `chart-${Math.random().toString(36).slice(2, 8)}`;
    const encoded = typeof Buffer !== "undefined"
      ? Buffer.from(JSON.stringify(config)).toString("base64")
      : btoa(JSON.stringify(config));

    return `
<div class="chart-block" data-chart="${encoded}" data-chart-id="${id}">
  ${config.title ? `<div class="chart-title">${config.title}</div>` : ""}
  <div class="chart-canvas-wrap" style="height:${config.height || 260}px">
    <canvas id="${id}"></canvas>
  </div>
  ${config.source ? `<div class="chart-source">${config.source}</div>` : ""}
  <noscript><p class="chart-noscript">[Chart: ${config.title || "data visualization"}]</p></noscript>
</div>`;
  },
};
