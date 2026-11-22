import type { Metadata } from "next";
import Link from "next/link";
import { T } from "@/lib/i18n/client";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="px-4 py-16 text-center">
      <h1 className="text-title font-bold"><T k="ui.notFound.title" /></h1>
      <p className="mt-2 text-muted"><T k="ui.notFound.body" /></p>
      <div className="mt-6 flex justify-center">
        <Link href="/" className="btn btn-md btn-primary">
          <T k="ui.error.home" />
        </Link>
      </div>
    </div>
  );
}
