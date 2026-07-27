import React from "react";
import ReactDOM from "react-dom/client";
import { ProgressWidget } from "./components/ProgressWidget";
import { Settings } from "./pages/Settings";
import { useAppStore } from "./stores/app";
import "./styles/global.css";

export function App() {
  const load = useAppStore((state) => state.load);
  React.useEffect(() => { void load(); }, [load]);
  return new URLSearchParams(location.search).get("mode") === "settings" ? <Settings /> : <ProgressWidget />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
