import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import GeeraExperience from "./GeeraExperience";
import "./styles.css";
const App = lazy(() => import("./App"));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {Capacitor.isNativePlatform() ? <Suspense fallback={<p>Opening canvas…</p>}><App /></Suspense> : <GeeraExperience />}
  </StrictMode>
);
