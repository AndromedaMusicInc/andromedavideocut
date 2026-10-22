import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { Editor } from "@/components/editor/Editor";
import { Welcome } from "@/components/editor/Welcome";
import type { ProjectMeta } from "@/lib/editor/projects";
import type { ToolId } from "@/lib/editor/types";
import "./styles.css";
import { APP_TITLE } from "@/lib/version";

document.title = APP_TITLE;

function App() {
  const [tool, setTool] = useState<ToolId | undefined>();
  const [open, setOpen] = useState<ProjectMeta | null>(null);
  if (!open) return <Welcome onOpen={(p, t) => { setTool(t); setOpen(p); }} />;
  return <Editor key={open.id} project={open} tool={tool} onHome={() => setOpen(null)} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
