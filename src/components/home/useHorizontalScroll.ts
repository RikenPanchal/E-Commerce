"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type UIEvent as ReactUIEvent,
} from "react";

/**
 * Shared drag/swipe/arrow scroll mechanics for every homepage carousel
 * (Best Sellers, Trending Now, New Arrivals, Recently Viewed, Picked for
 * You) - one implementation instead of five near-identical copies, each of
 * which renders its own card markup completely differently. Native touch
 * scrolling on phones/tablets is left alone (untouched, so it stays as
 * smooth as the OS makes it) by only handling mouse-pointer drag.
 *
 * `scrollByPage` moves a full screen's worth of cards per call, not a
 * single card - a single-card nudge is a barely-perceptible "small scroll"
 * when several cards are visible at once.
 */
export function useHorizontalScroll() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: false });
  const [canScroll, setCanScroll] = useState(false);
  const dragState = useRef({ startX: 0, startScrollLeft: 0, moved: 0 });

  const updateState = useCallback((el: HTMLDivElement) => {
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScroll(maxScroll > 2);
    setEdges({ atStart: el.scrollLeft <= 2, atEnd: el.scrollLeft >= maxScroll - 2 });
  }, []);

  function handleScroll(event: ReactUIEvent<HTMLDivElement>) {
    updateState(event.currentTarget);
  }

  const scrollByPage = useCallback((direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateState(el);
    const handleResize = () => updateState(el);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateState]);

  // Mouse-drag-to-scroll for desktop, where there's no touch swipe.
  // Deliberately not `setPointerCapture` - capturing the pointer on the
  // scroller retargets the browser's synthesized `click` to the scroller
  // itself instead of whatever card link is under the cursor, so a plain
  // (no-drag) click would stop navigating anywhere. Tracking via temporary
  // `window` listeners avoids that while still following the cursor
  // outside the element's bounds.
  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    const el = scrollerRef.current;
    if (!el) return;
    dragState.current = { startX: event.clientX, startScrollLeft: el.scrollLeft, moved: 0 };
    el.style.scrollSnapType = "none";
    el.style.cursor = "grabbing";

    function onMove(moveEvent: PointerEvent) {
      const dx = moveEvent.clientX - dragState.current.startX;
      dragState.current.moved = Math.max(dragState.current.moved, Math.abs(dx));
      el!.scrollLeft = dragState.current.startScrollLeft - dx;
    }
    function onUp() {
      el!.style.scrollSnapType = "";
      el!.style.cursor = "";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  // Dragging even a few pixels shouldn't also follow a card's link -
  // suppress the click a mouseup-over-a-link would otherwise fire.
  function handleClickCapture(event: ReactMouseEvent<HTMLDivElement>) {
    if (dragState.current.moved > 5) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  return { scrollerRef, edges, canScroll, scrollByPage, handleScroll, handlePointerDown, handleClickCapture };
}
