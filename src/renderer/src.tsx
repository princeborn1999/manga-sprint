import React from "react";
import ReactDOM from "react-dom/client";
import { ProgressWidget } from "./components/ProgressWidget";
import { Settings } from "./pages/Settings";
import { PostStudio } from "./pages/PostStudio";
import { useAppStore } from "./stores/app";
import "./styles/global.css";

export function App() {
  const load = useAppStore((state) => state.load);
  React.useEffect(() => { void load(); }, [load]);
  const mode = new URLSearchParams(location.search).get("mode");
  if (mode === "settings") return <Settings />;
  if (mode === "post-studio") return <PostStudio />;
  return <ProgressWidget />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
