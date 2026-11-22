import TabBar from "@/components/ui/TabBar";

export default function AdminTabs({ active, openReports }: { active: "approvals" | "reports" | "suggestions" | "majors" | "reels" | "invites" | "people" | "health"; openReports?: number }) {
  return (
    <TabBar
      scroll
      label="Admin sections"
      active={active}
      tabs={[
        { key: "approvals", label: "Approvals", href: "/admin" },
        { key: "reports", label: openReports ? `Reports (${openReports})` : "Reports", href: "/admin/reports" },
        { key: "suggestions", label: "Suggestions", href: "/admin/suggestions" },
        { key: "majors", label: "Majors", href: "/admin/majors" },
        { key: "reels", label: "Reels", href: "/admin/reels" },
        { key: "invites", label: "Invites", href: "/admin/invites" },
        { key: "people", label: "People", href: "/admin/people" },
        { key: "health", label: "Health", href: "/admin/health" },
      ]}
    />
  );
}
