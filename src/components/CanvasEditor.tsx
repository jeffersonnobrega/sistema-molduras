"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export default function CanvasEditor() {
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  const pinchRef = useRef({
    active: false,
    lastDist: 0,
    lastZoom: 1,
  });

  // =========================
  // HELPERS
  // =========================

  const getPos = (e: any) =>
    "touches" in e
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: e.clientX, y: e.clientY };

  // =========================
  // EVENTS
  // =========================

  const start = (e: any) => {
    if ("touches" in e && e.touches.length === 2) return;

    setIsDragging(true);
    setLastPos(getPos(e));
  };

  const move = (e: any) => {
    if ("touches" in e) e.preventDefault();

    // ================= PINCH (FIX DEFINITIVO)
    if ("touches" in e && e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];

      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

      if (!pinchRef.current.active) {
        pinchRef.current = {
          active: true,
          lastDist: dist,
          lastZoom: zoom,
        };
        return;
      }

      let nextZoom = zoom;

      // 🔥 chave do fix: crescimento determinístico
      if (dist > pinchRef.current.lastDist) {
        nextZoom = zoom * 1.05;
      } else {
        nextZoom = zoom * 0.98;
      }

      // clamp
      if (nextZoom > 3) nextZoom = 3;
      if (nextZoom < 0.5) nextZoom = 0.5;

      pinchRef.current.lastDist = dist;
      pinchRef.current.lastZoom = nextZoom;

      setZoom(nextZoom);
      return;
    }

    if ("touches" in e && e.touches.length < 2) {
      pinchRef.current.active = false;
    }

    // ================= DRAG
    if (!isDragging) return;

    const p = getPos(e);

    setLastPos(p);
  };

  const end = () => {
    pinchRef.current.active = false;
    setIsDragging(false);
  };

  // =========================
  // UI SIMPLES (só pra teste)
  // =========================

  return (
    <div
      className="w-full h-[300px] bg-gray-200"
      onMouseDown={start}
      onMouseMove={move}
      onMouseUp={end}
      onTouchStart={start}
      onTouchMove={move}
      onTouchEnd={end}
      style={{ touchAction: "none" }}
    >
      <div className="text-center pt-20 text-sm">
        Zoom atual: {zoom.toFixed(2)}
      </div>
    </div>
  );
}
