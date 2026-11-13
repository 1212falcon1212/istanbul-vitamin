"use client";
import { useMemo } from "react";
import { useSettings } from "./settings";
import { parseHomeContent } from "./home-content";
export function useHomeContent() {
  const { settings } = useSettings();
  return useMemo(
    () => parseHomeContent(settings.homepage_content),
    [settings.homepage_content],
  );
}
