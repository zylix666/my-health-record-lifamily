import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./ui/App";
import "./ui/styles.css";
import { registerSW } from "virtual:pwa-register";

let reloadingForServiceWorkerUpdate = false;

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloadingForServiceWorkerUpdate) return;
    reloadingForServiceWorkerUpdate = true;
    window.location.reload();
  });
}

const updateServiceWorker = registerSW({
  immediate: true,
  onNeedRefresh() {
    reloadingForServiceWorkerUpdate = true;
    void updateServiceWorker(true);
  },
  onRegisteredSW(_scriptUrl, registration) {
    if (!registration) return;

    window.setInterval(() => {
      void registration.update();
    }, 5 * 60 * 1000);
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
