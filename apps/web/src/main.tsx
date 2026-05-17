import React from "react";
import ReactDOM from "react-dom/client";
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
  return (
    <main className="site-shell">
      <InvitationSections content={weddingContent} />
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
