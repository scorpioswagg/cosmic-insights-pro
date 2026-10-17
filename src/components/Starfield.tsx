import { useEffect, useRef } from "react";

export function Starfield() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const count = 140;
    for (let i = 0; i < count; i++) {
      const star = document.createElement("div");
      star.className = "cb-star";
      const size = Math.random() * 2.2 + 0.4;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.setProperty("--duration", `${(Math.random() * 4 + 2.5).toFixed(2)}s`);
      star.style.setProperty("--delay", `${(Math.random() * 6).toFixed(2)}s`);
      star.style.setProperty("--min-opacity", (Math.random() * 0.25 + 0.1).toFixed(2));
      star.style.setProperty("--max-opacity", (Math.random() * 0.55 + 0.4).toFixed(2));
      el.appendChild(star);
    }

    function shoot() {
      if (!el) return;
      const s = document.createElement("div");
      s.className = "cb-shooting-star";
      s.style.left = `${Math.random() * 40 - 10}%`;
      s.style.top = `${Math.random() * 40}%`;
      el.appendChild(s);
      setTimeout(() => s.remove(), 5000);
    }

    const t1 = setTimeout(shoot, 1200);
    const t2 = setTimeout(shoot, 3800);
    const interval = setInterval(() => {
      if (Math.random() > 0.55) shoot();
    }, 4200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(interval);
      el.innerHTML = "";
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    />
  );
}
