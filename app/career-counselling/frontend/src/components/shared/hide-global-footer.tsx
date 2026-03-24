"use client";

import { useEffect } from "react";

/**
 * Mount this inside any page that has its own side/inline footer.
 * It suppresses the root-layout global footer via a CSS data-attribute.
 */
export function HideGlobalFooter() {
  useEffect(() => {
    document.body.setAttribute("data-hide-footer", "true");
    return () => {
      document.body.removeAttribute("data-hide-footer");
    };
  }, []);

  return null;
}
