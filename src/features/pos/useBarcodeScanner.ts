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
      const currentTime = Date.now();
      
      // If time between keys is too long, reset buffer. (Scanners type very fast, < 30ms per char)
      if (currentTime - lastKeyTime > 100) {
        buffer = "";
      }
      
      lastKeyTime = currentTime;

      if (e.key === "Enter") {
        if (buffer.length > 2) {
          if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
             // Prevent scanner's Enter key from submitting forms accidentally
             e.preventDefault();
             // The characters have already been natively typed into the input, which is fine
          } else {
             onScan(buffer);
          }
        }
        buffer = "";
        return;
      }

      if (e.key.length === 1) {
        buffer += e.key;
      }

      // If we are just typing normally in an input field, do not process further
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onScan]);
}
