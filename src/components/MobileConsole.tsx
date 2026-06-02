"use client";

import { useEffect } from "react";

export default function MobileConsole() {
  useEffect(() => {
    // Só carrega se estiver em ambiente de desenvolvimento local e no navegador
    if (
      process.env.NODE_ENV === "development" &&
      typeof window !== "undefined"
    ) {
      import("eruda").then((eruda) => {
        // Evita inicializar o Eruda duas vezes em modo estrito (StrictMode)
        const existingContainer = document.getElementById("eruda");
        if (!existingContainer) {
          eruda.default.init();
        }
      });
    }
  }, []);

  return null;
}
