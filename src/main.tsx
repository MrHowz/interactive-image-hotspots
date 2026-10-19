import { createRoot } from "react-dom/client";
import { App } from "./App";
import { Editor } from "./Editor";
import { Viewer } from "./Viewer";
import "./style.css";
const params = new URLSearchParams(location.search);
createRoot(document.getElementById("root")!).render(
  params.get("view") === "viewer" ? (
    <Viewer params={params} />
  ) : params.get("view") === "editor" ? (
    <Editor params={params} />
  ) : (
    <App />
  ),
);
