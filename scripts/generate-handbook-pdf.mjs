import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = fileURLToPath(new URL(import.meta.url));
const repoRoot = path.resolve(path.dirname(here), "..");
const mdPath = path.join(repoRoot, "docs", "ORBIT-HANDBOOK.md");
const htmlPath = path.join(repoRoot, "docs", "ORBIT-HANDBOOK.print.html");
const pdfPath = path.join(repoRoot, "docs", "ORBIT-HANDBOOK.pdf");

const md = fs.readFileSync(mdPath, "utf8");

function escapeHtml(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Minimal Markdown → HTML converter for this handbook:
 * - headings ## / ###
 * - horizontal rules ---
 * - paragraphs
 * - unordered lists (- item)
 * - ordered lists (1. item)
 * - images ![alt](url)
 * - bold **text**
 * - inline `code`
 */
function mdToHtml(mdText) {
  const lines = mdText.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let inUl = false;
  let inOl = false;

  function closeLists() {
    if (inUl) {
      out.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      out.push("</ol>");
      inOl = false;
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const t = line.trim();

    if (t === "---") {
      closeLists();
      out.push("<hr />");
      continue;
    }

    if (t.startsWith("### ")) {
      closeLists();
      out.push(`<h3>${formatInline(t.slice(4))}</h3>`);
      continue;
    }

    if (t.startsWith("## ")) {
      closeLists();
      out.push(`<h2>${formatInline(t.slice(3))}</h2>`);
      continue;
    }

    if (t.startsWith("# ")) {
      closeLists();
      out.push(`<h1>${formatInline(t.slice(2))}</h1>`);
      continue;
    }

    const img = t.match(/^!\[(.*?)\]\((.*?)\)\s*$/);
    if (img) {
      closeLists();
      const alt = img[1] || "";
      const src = img[2] || "";
      out.push(`<figure class="figure"><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" /><figcaption>${escapeHtml(alt)}</figcaption></figure>`);
      continue;
    }

    const ul = t.match(/^-\s+(.*)$/);
    if (ul) {
      if (inOl) {
        out.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        out.push("<ul>");
        inUl = true;
      }
      out.push(`<li>${formatInline(ul[1] || "")}</li>`);
      continue;
    }

    const ol = t.match(/^\d+\.\s+(.*)$/);
    if (ol) {
      if (inUl) {
        out.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        out.push("<ol>");
        inOl = true;
      }
      out.push(`<li>${formatInline(ol[1] || "")}</li>`);
      continue;
    }

    if (t === "") {
      closeLists();
      continue;
    }

    closeLists();
    out.push(`<p>${formatInline(t)}</p>`);
  }

  closeLists();
  return out.join("\n");
}

function formatInline(text) {
  // images are handled as block lines in this handbook; ignore here
  let s = escapeHtml(text);

  // bold **...**
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // inline `code`
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");

  return s;
}

const bodyHtml = mdToHtml(md);

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Orbit Handbook</title>
    <style>
      @page { size: A4; margin: 18mm 16mm; }
      html, body {
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Noto Sans", "Apple Color Emoji",
          "Segoe UI Emoji";
        color: #111;
        background: #fff;
      }
      main { max-width: 900px; margin: 0 auto; }
      h1 { font-size: 28px; margin: 0 0 12px; }
      h2 { font-size: 20px; margin: 22px 0 10px; page-break-after: avoid; }
      h3 { font-size: 15px; margin: 16px 0 8px; page-break-after: avoid; }
      p { margin: 8px 0; line-height: 1.55; font-size: 12.5px; }
      ul, ol { margin: 8px 0 8px 20px; padding: 0; }
      li { line-height: 1.55; font-size: 12.5px; margin: 4px 0; }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: 12px; background: #f4f4f5; padding: 1px 4px; border-radius: 4px; }
      hr { border: 0; border-top: 1px solid #e4e4e7; margin: 16px 0; }
      figure.figure { margin: 12px 0; page-break-inside: avoid; }
      figure.figure img {
        width: 100%;
        height: auto;
        border: 1px solid #e4e4e7;
        border-radius: 10px;
      }
      figcaption { font-size: 11px; color: #52525b; margin-top: 6px; }
      .muted { color: #52525b; font-size: 12px; margin-top: 6px; }
    </style>
  </head>
  <body>
    <main>
      ${bodyHtml}
      <p class="muted">Generated from <code>docs/ORBIT-HANDBOOK.md</code> for PDF printing.</p>
    </main>
  </body>
</html>
`;

fs.writeFileSync(htmlPath, html, "utf8");

// Print instructions for Chrome headless (Windows-friendly)
const htmlUrl = pathToFileURL(htmlPath).href;
console.log(`Wrote ${path.relative(repoRoot, htmlPath)}`);
console.log(`Open or print-to-PDF URL:\n${htmlUrl}`);
console.log(`Target PDF path:\n${pdfPath}`);
