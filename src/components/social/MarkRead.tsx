"use client";

import { useEffect } from "react";
import { markAllRead } from "@/app/notifications/actions";

/** Marks notifications read once the page has been seen (not during server rendering). */
export default function MarkRead() {
  useEffect(() => {
    markAllRead().then(() => window.dispatchEvent(new Event("smashy:notifications-read")));
  }, []);
  return null;
}
