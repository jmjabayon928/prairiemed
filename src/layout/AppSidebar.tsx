"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { useTranslations } from "next-intl";

// Reuse TailAdmin’s icon set so styling stays consistent
import {
  BoxCubeIcon,
  CalenderIcon,
  //ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PageIcon,
  PieChartIcon,
  PlugInIcon,
  TableIcon,
  UserCircleIcon,
} from "../icons/index";

type SubItem = {
  key: string;       // e.g. 'menu.dashboard.overview'
  path: string;      // e.g. '/dashboard'
  pro?: boolean;
  new?: boolean;
};

type NavItem = {
  key: string;       // e.g. 'menu.dashboard._'
  icon: React.ReactNode;
  path?: string;
  subItems?: SubItem[];
};

// PrairieMed main menu (translation keys in src/messages/*/common.json)
const navItems: NavItem[] = [
  {
    key: "menu.dashboard._",
    icon: <GridIcon />,
    subItems: [
      { key: "menu.dashboard.overview", path: "/dashboard" },
      { key: "menu.dashboard.notifications", path: "/dashboard/notifications" },
      { key: "menu.dashboard.quickLinks", path: "/dashboard/quick-links" },
    ],
  },
  {
    key: "menu.patients._",
    icon: <UserCircleIcon />,
    subItems: [
      { key: "menu.patients.registry", path: "/patients" },
      { key: "menu.patients.admissions", path: "/patients/admissions" },
      { key: "menu.patients.transfers", path: "/patients/transfers" },
      { key: "menu.patients.search", path: "/patients/search" },
    ],
  },
  {
    key: "menu.appointments._",
    icon: <CalenderIcon />,
    subItems: [
      { key: "menu.appointments.calendar", path: "/appointments/calendar" },
      { key: "menu.appointments.types", path: "/appointments/types" },
      { key: "menu.appointments.rules", path: "/appointments/rules" },
    ],
  },
  {
    key: "menu.clinical._",
    icon: <ListIcon />,
    subItems: [
      { key: "menu.clinical.ehr", path: "/clinical/ehr" },
      { key: "menu.clinical.encounters", path: "/clinical/encounters" },
      { key: "menu.clinical.diagnosis", path: "/clinical/diagnosis" },
      { key: "menu.clinical.forms", path: "/clinical/forms" },
    ],
  },
  {
    key: "menu.laboratory._",
    icon: <TableIcon />,
    subItems: [
      { key: "menu.laboratory.orders", path: "/lab/orders" },
      { key: "menu.laboratory.results", path: "/lab/results" },
      { key: "menu.laboratory.catalog", path: "/lab/catalog" },
    ],
  },
  {
    key: "menu.pharmacy._",
    icon: <BoxCubeIcon />,
    subItems: [
      { key: "menu.pharmacy.inventory", path: "/pharmacy/inventory" },
      { key: "menu.pharmacy.prescriptions", path: "/pharmacy/prescriptions" },
      { key: "menu.pharmacy.dispensing", path: "/pharmacy/dispensing" },
    ],
  },
  {
    key: "menu.billing._",
    icon: <PieChartIcon />,
    subItems: [
      { key: "menu.billing.invoices", path: "/billing/invoices" },
      { key: "menu.billing.payments", path: "/billing/payments" },
      { key: "menu.billing.claims", path: "/billing/claims" },
    ],
  },
  {
    key: "menu.hr._",
    icon: <PageIcon />,
    subItems: [
      { key: "menu.hr.staff", path: "/hr/staff" },
      { key: "menu.hr.roles", path: "/hr/roles" },
      { key: "menu.hr.attendance", path: "/hr/attendance" },
    ],
  },
  {
    key: "menu.inventory._",
    icon: <PlugInIcon />,
    subItems: [
      { key: "menu.inventory.supplies", path: "/inventory/supplies" },
      { key: "menu.inventory.equipment", path: "/inventory/equipment" },
      { key: "menu.inventory.transactions", path: "/inventory/transactions" },
    ],
  },
  {
    key: "menu.reports._",
    icon: <PageIcon />,
    subItems: [
      { key: "menu.reports.clinical", path: "/reports/clinical" },
      { key: "menu.reports.financial", path: "/reports/financial" },
      { key: "menu.reports.kpis", path: "/reports/kpis" },
    ],
  },
  {
    key: "menu.admin._",
    icon: <TableIcon />,
    subItems: [
      { key: "menu.admin.users", path: "/admin/users" },
      { key: "menu.admin.facilities", path: "/admin/facilities" },
      { key: "menu.admin.audit", path: "/admin/audit" },
      { key: "menu.admin.settings", path: "/admin/settings" },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const t = useTranslations("common"); // will use keys like 'menu.dashboard._'
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();

  const [openSubmenu, setOpenSubmenu] = useState<{ type: "main"; index: number } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  // Auto-open submenu that contains the current route
  useEffect(() => {
    let submenuMatched = false;
    navItems.forEach((nav, index) => {
      nav.subItems?.forEach((sub) => {
        if (isActive(sub.path)) {
          setOpenSubmenu({ type: "main", index });
          submenuMatched = true;
        }
      });
    });
    if (!submenuMatched) setOpenSubmenu(null);
  }, [pathname, isActive]);

  // Measure submenu heights for smooth expand/collapse
  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prev) => ({
          ...prev,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number) => {
    setOpenSubmenu((prev) =>
      prev && prev.type === "main" && prev.index === index ? null : { type: "main", index }
    );
  };

  const renderMenuItems = (items: NavItem[]) => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={nav.key}>
          {nav.subItems ? (
            <>
              <button
                onClick={() => handleSubmenuToggle(index)}
                className={`menu-item group ${
                  openSubmenu?.type === "main" && openSubmenu?.index === index
                    ? "menu-item-active"
                    : "menu-item-inactive"
                } cursor-pointer ${
                  !isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"
                }`}
              >
                <span
                  className={`${
                    openSubmenu?.type === "main" && openSubmenu?.index === index
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{t(nav.key)}</span>
                )}
                {(isExpanded || isHovered || isMobileOpen) && (
                  <ChevronDown
                    className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                      openSubmenu?.type === "main" && openSubmenu?.index === index
                        ? "rotate-180 text-brand-500"
                        : ""
                    }`}
                  />
                )}
              </button>

              {(isExpanded || isHovered || isMobileOpen) && (
                <div
                  ref={(el) => {
                    subMenuRefs.current[`main-${index}`] = el;
                  }}
                  className="overflow-hidden transition-all duration-300"
                  style={{
                    height:
                      openSubmenu?.type === "main" && openSubmenu?.index === index
                        ? `${subMenuHeight[`main-${index}`] || 0}px`
                        : "0px",
                  }}
                >
                  <ul className="mt-2 space-y-1 ml-9">
                    {nav.subItems.map((sub) => (
                      <li key={sub.key}>
                        <Link
                          href={sub.path}
                          className={`menu-dropdown-item ${
                            isActive(sub.path)
                              ? "menu-dropdown-item-active"
                              : "menu-dropdown-item-inactive"
                          }`}
                        >
                          {t(sub.key)}
                          <span className="flex items-center gap-1 ml-auto">
                            {sub.new && (
                              <span
                                className={`ml-auto ${
                                  isActive(sub.path)
                                    ? "menu-dropdown-badge-active"
                                    : "menu-dropdown-badge-inactive"
                                } menu-dropdown-badge`}
                              >
                                new
                              </span>
                            )}
                            {sub.pro && (
                              <span
                                className={`ml-auto ${
                                  isActive(sub.path)
                                    ? "menu-dropdown-badge-active"
                                    : "menu-dropdown-badge-inactive"
                                } menu-dropdown-badge`}
                              >
                                pro
                              </span>
                            )}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`${
                    isActive(nav.path) ? "menu-item-icon-active" : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{t(nav.key)}</span>
                )}
              </Link>
            )
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link href="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <Image
                className="dark:hidden"
                src="/images/logo/logo.svg"
                alt="Logo"
                width={150}
                height={40}
              />
              <Image
                className="hidden dark:block"
                src="/images/logo/logo-dark.svg"
                alt="Logo"
                width={150}
                height={40}
              />
            </>
          ) : (
            <Image src="/images/logo/logo-icon.svg" alt="Logo" width={32} height={32} />
          )}
        </Link>
      </div>

      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? "Menu" : <HorizontaLDots />}
              </h2>
              {renderMenuItems(navItems)}
            </div>
          </div>
        </nav>

      </div>
    </aside>
  );
};

export default AppSidebar;
