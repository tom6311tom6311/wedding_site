import React from "react";
import ReactDOM from "react-dom/client";
import { AdminPage } from "./components/AdminPage";
import { BackgroundMusic } from "./components/BackgroundMusic";
import { InvitationSections } from "./components/InvitationSections";
import { weddingContent } from "./content";
import "./styles.css";

document.title = weddingContent.metadata.title;

const description = document.querySelector<HTMLMetaElement>(
  'meta[name="description"]',
);

if (description) {
  description.content = weddingContent.metadata.description;
}

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
