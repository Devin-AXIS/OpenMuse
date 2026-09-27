"use client"

import { useEffect, type RefObject } from "react"

/**
 * Hook for mobile keyboard handling - NO scrollIntoView.
 * The layout should handle keyboard positioning via CSS, not JavaScript scrolling.
 * This hook is kept for potential future use but doesn't interfere with layout.
 *
 * @param inputRef - Reference to the input/textarea element
 */
export function useKeyboardAware(inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement>) {
  // Removed scrollIntoView to prevent page jumping
  // Layout is now handled purely via CSS with visualViewport API
  useEffect(() => {
    // Placeholder for any future keyboard-related logic
    // Currently, all keyboard handling is done via CSS layout
  }, [inputRef])
}
