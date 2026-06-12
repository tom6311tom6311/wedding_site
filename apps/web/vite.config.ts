import react from "@vitejs/plugin-react";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

type WeddingMetadata = {
  metadata: {
    title: string;
    description: string;
  };
};

export default defineConfig({
  plugins: [weddingMetadataHtmlPlugin(), react()],
});

function weddingMetadataHtmlPlugin(): Plugin {
  return {
    name: "wedding-metadata-html",
    transformIndexHtml(html) {
      const metadata = loadWeddingMetadata();

      return html
        .replace(/%WEDDING_TITLE%/g, escapeHtml(metadata.title))
        .replace(/%WEDDING_DESCRIPTION%/g, escapeHtml(metadata.description));
    },
  };
}

function loadWeddingMetadata() {
  const contentPath = [
    resolve(__dirname, "src/content/wedding.local.json"),
    resolve(__dirname, "src/content/wedding.json"),
  ].find((filePath) => existsSync(filePath));

  if (!contentPath) {
    throw new Error("Missing wedding content JSON.");
  }

  const content = JSON.parse(readFileSync(contentPath, "utf8")) as WeddingMetadata;

  return content.metadata;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "\"":
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}
