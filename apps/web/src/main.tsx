import React from "react";
import ReactDOM from "react-dom/client";
import { AdminPage } from "./components/AdminPage";
import { BackgroundMusic } from "./components/BackgroundMusic";
import { InvitationSections } from "./components/InvitationSections";
import { weddingContent } from "./content";
import "./styles.css";

const HERO_IMAGE_PRELOAD_LIMIT = 3;

document.title = weddingContent.metadata.title;

const description = document.querySelector<HTMLMetaElement>(
  'meta[name="description"]',
);

if (description) {
  description.content = weddingContent.metadata.description;
}

preloadHeroImages(weddingContent.hero);

function App() {
  if (window.location.pathname === "/admin") {
    document.title = `Admin | ${weddingContent.metadata.title}`;

    return <AdminPage content={weddingContent} />;
  }

  return (
    <main className="site-shell">
      <InvitationSections content={weddingContent} />
      <BackgroundMusic music={weddingContent.music} />
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

function preloadHeroImages(hero: typeof weddingContent.hero) {
  const images = hero.images && hero.images.length > 0 ? hero.images : [hero.image];

  images.slice(0, HERO_IMAGE_PRELOAD_LIMIT).forEach((image, index) => {
    const existingPreload = document.querySelector<HTMLLinkElement>(
      `link[rel="preload"][as="image"][href="${CSS.escape(image.src)}"]`,
    );

    if (existingPreload) {
      return;
    }

    const link = document.createElement("link");

    link.rel = "preload";
    link.as = "image";
    link.href = image.src;
    link.fetchPriority = index === 0 ? "high" : "auto";
    document.head.append(link);
  });
}
