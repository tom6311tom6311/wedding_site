const fs = require("fs");
const path = require("path");
const subsetFont = require("subset-font");

const rootDir = path.resolve(__dirname, "../../..");
const sourceFont = path.join(
  rootDir,
  "apps/web/fonts/ChenYuluoyan-2.0-Thin.woff2",
);
const outputFont = path.join(
  rootDir,
  "apps/web/public/fonts/ChenYuluoyan-2.0-Thin.subset.woff2",
);
const scanRoots = [
  path.join(rootDir, "apps/web/index.html"),
  path.join(rootDir, "apps/web/src"),
];
const textExtensions = new Set([".html", ".json", ".ts", ".tsx"]);
const safetyText = [
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  "0123456789",
  " !\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~",
  "，。！？、；：「」『』（）《》〈〉—…．·",
  "年月日時分秒上下左右前後第名位人桌號喜宴婚禮邀請",
].join("");

function collectFiles(entry) {
  const stat = fs.statSync(entry);

  if (stat.isFile()) {
    return textExtensions.has(path.extname(entry)) ? [entry] : [];
  }

  return fs
    .readdirSync(entry)
    .flatMap((name) => collectFiles(path.join(entry, name)));
}

function collectText() {
  const text = scanRoots
    .flatMap((entry) => collectFiles(entry))
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");

  return Array.from(new Set(`${safetyText}\n${text}`)).join("");
}

async function main() {
  const input = fs.readFileSync(sourceFont);
  const text = collectText();
  const output = await subsetFont(input, text, {
    targetFormat: "woff2",
  });

  fs.writeFileSync(outputFont, output);

  const beforeKiB = Math.round(input.length / 1024);
  const afterKiB = Math.round(output.length / 1024);
  console.log(
    `Subset font written: ${path.relative(rootDir, outputFont)} (${beforeKiB} KiB -> ${afterKiB} KiB, ${text.length} chars)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
