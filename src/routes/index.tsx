import { Editor } from "@/components/editor/Editor";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <Editor />;
}
