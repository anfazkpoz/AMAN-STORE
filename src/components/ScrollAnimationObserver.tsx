"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Universal Scroll Animation Observer
 * Detects elements with `.scroll-reveal`, `.scroll-reveal-scale`,
 * `.scroll-reveal-left`, `.scroll-reveal-right`, `.scroll-stagger`,
 * as well as semantic <section> and [data-section] elements.
 * 
 * Automatically reveals elements when they enter the viewport
 * with smooth, modern transitions on scroll.
 */
export default function ScrollAnimationObserver() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const SELECTOR = ".scroll-reveal, .scroll-reveal-scale, .scroll-reveal-left, .scroll-reveal-right, .scroll-stagger, section, [data-section]";

    const checkAndRevealElement = (el: Element) => {
      if (prefersReducedMotion) {
        el.classList.add("is-visible");
        return true;
      }

      const rect = el.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      
      // If already within or above the viewport (or slightly below trigger point)
      if (rect.top <= viewportHeight * 0.92) {
        el.classList.add("is-visible");
        return true;
      }
      return false;
    };

    // Auto-tag sections that don't have reveal classes yet
    const autoTagSections = () => {
      const untagged = document.querySelectorAll("section:not(.scroll-reveal):not(.scroll-reveal-scale), [data-section]:not(.scroll-reveal)");
      untagged.forEach((sec) => {
        sec.classList.add("scroll-reveal");
      });
    };

    autoTagSections();

    // IntersectionObserver for performant scroll-triggered reveal
    let observer: IntersectionObserver | null = null;

    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              // Once revealed, unobserve to prevent re-trigger flicker
              observer?.unobserve(entry.target);
            }
          });
        },
        {
          root: null, // Relative to viewport
          rootMargin: "0px 0px -40px 0px", // Trigger slightly before full entry
          threshold: 0.05,
        }
      );
    }

    const attachObservers = () => {
      autoTagSections();
      const elements = document.querySelectorAll(SELECTOR);
      
      elements.forEach((el) => {
        // If already visible in initial viewport, reveal immediately
        const revealed = checkAndRevealElement(el);
        if (!revealed && observer) {
          observer.observe(el);
        }
      });
    };

    // Initial attachment
    attachObservers();

    // Secondary pass after brief delay to catch dynamic client-side rendering
    const timer = setTimeout(attachObservers, 150);

    // Scroll listener for inner scrollable containers (e.g. main.overflow-y-auto)
    const handleScroll = () => {
      const unrevealed = document.querySelectorAll(`${SELECTOR}:not(.is-visible)`);
      unrevealed.forEach((el) => {
        if (checkAndRevealElement(el) && observer) {
          observer.unobserve(el);
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    
    // Also listen to main container scroll if present
    const mainContainer = document.querySelector("main");
    if (mainContainer) {
      mainContainer.addEventListener("scroll", handleScroll, { passive: true });
    }

    // MutationObserver to watch for new items loaded dynamically
    const mutationObserver = new MutationObserver(() => {
      attachObservers();
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
      if (mainContainer) {
        mainContainer.removeEventListener("scroll", handleScroll);
      }
      mutationObserver.disconnect();
      if (observer) {
        observer.disconnect();
      }
    };
  }, [pathname]);

  return null;
}
