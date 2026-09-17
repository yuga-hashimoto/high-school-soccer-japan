"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useFavorites } from "./favorites-context";

/**
 * Records which competition pages the user opened, so the home screen can
 * offer よく見るリーグ without any server-side tracking.
 */
export function TrackView() {
  const pathname = usePathname();
  const { recordCompetitionView, ready } = useFavorites();

  useEffect(() => {
    if (!ready) return;
    const match = pathname?.match(/^\/competition\/([^/]+)/);
    if (match) recordCompetitionView(match[1]);
  }, [pathname, ready, recordCompetitionView]);

  return null;
}
