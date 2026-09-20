import { useEffect } from "react";

/**
 * A custom hook to capture barcode scanner input natively.
 * Most USB barcode scanners emulate a keyboard and send characters rapidly,
 * followed by an Enter key.
 */
export function useBarcodeScanner(onScan: (barcode: string) => void) {
  useEffect(() => {
    let buffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input field (except if we want scanning to override)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        // Only ignore if it's not our dedicated search box, or we let the search box handle it.
        // Actually, if they are focused on search, let's let the input handle it, then they press Enter.
        return;
      }

      const currentTime = Date.now();
      
      // If time between keys is too long, reset buffer. (Scanners type very fast, < 30ms per char)
      if (currentTime - lastKeyTime > 100) {
        buffer = "";
      }
      
      lastKeyTime = currentTime;

      if (e.key === "Enter") {
        if (buffer.length > 2) {
          onScan(buffer);
        }
        buffer = "";
        return;
      }

      if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onScan]);
}
