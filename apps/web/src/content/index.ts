import type { WeddingContent } from "./types";
import { sectionAnchors } from "./anchors";

const contentModules = import.meta.glob("./wedding*.json", {
  eager: true,
  import: "default",
}) as Record<string, WeddingContent>;

export const weddingContent =
  contentModules["./wedding.local.json"] ?? contentModules["./wedding.json"];

const validSectionAnchors = new Set<string>(sectionAnchors);
const internalLinks = weddingContent.hero.actions
  .map((action) => action.href)
  .filter((href) => href.startsWith("#"));
const invalidInternalLinks = internalLinks.filter(
  (href) => !validSectionAnchors.has(href),
);

if (invalidInternalLinks.length > 0) {
  throw new Error(
    `Invalid wedding content anchors: ${invalidInternalLinks.join(", ")}`,
  );
}
