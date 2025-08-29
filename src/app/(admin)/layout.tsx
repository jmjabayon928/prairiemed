"use client";

import React from "react";
import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  // Keep TailAdmin’s responsive margin logic:
  // - Mobile open: content spans full width (no left margin)
  // - Desktop collapsed: 90px left margin
  // - Desktop expanded/hovered: 290px left margin
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";

  return (
    <div className="min-h-screen xl:flex">
      {/* Sidebar & mobile backdrop (unchanged for responsiveness) */}
      <AppSidebar />
      <Backdrop />

      {/* Main content area that shifts with sidebar width */}
      <div className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}>
        {/* Sticky header across pages */}
        <AppHeader />

        {/* Page content container */}
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
