"use client";

import { useEffect } from "react";

export default function ScrollReveal() {
  useEffect(() => {
    const shell = document.querySelector(".home-shell");
    if (!shell) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const revealTargets = Array.from(
      document.querySelectorAll(".scroll-float, .scroll-float-item"),
    );

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      revealTargets.forEach((target) => target.classList.add("is-visible"));
      return;
    }

    shell.classList.add("reveal-ready");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        threshold: 0.12,
        rootMargin: "0px 0px -8% 0px",
      },
    );

    revealTargets.forEach((target) => {
      const rect = target.getBoundingClientRect();
      const alreadyInView =
        rect.top < window.innerHeight * 0.92 && rect.bottom > 0;

      if (alreadyInView) {
        target.classList.add("is-visible");
      } else {
        observer.observe(target);
      }
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
