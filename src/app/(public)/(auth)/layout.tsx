// src/app/(public)/(auth)/layout.tsx
import React from "react";
import Image from "next/image";
import Link from "next/link";

import GridShape from "@/components/common/GridShape";
import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";
import { ThemeProvider } from "@/context/ThemeContext";

import { NextIntlClientProvider } from "next-intl";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/auth/constants";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Locale from cookie
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value;
  const locale: SupportedLocale =
    cookieLocale && (SUPPORTED_LOCALES as readonly string[]).includes(cookieLocale)
      ? (cookieLocale as SupportedLocale)
      : "en";

  // Explicitly import messages for this layout
  const common = (await import(`@/messages/${locale}/common.json`)).default;
  const auth = (await import(`@/messages/${locale}/auth.json`)).default;

  return (
    <NextIntlClientProvider locale={locale} messages={{ common, auth }}>
      <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
        <ThemeProvider>
          <div className="relative flex lg:flex-row w-full h-screen justify-center flex-col dark:bg-gray-900 sm:p-0">
            {children}

            <div className="lg:w-1/2 w-full h-full bg-brand-950 dark:bg-white/5 lg:grid items-center hidden">
              <div className="relative items-center justify-center flex z-1">
                {/* <!-- ===== Common Grid Shape Start ===== --> */}
                <GridShape />
                <div className="flex flex-col items-center max-w-xs">
                  <Link href="/" className="block mb-4">
                    <Image
                      width={231}
                      height={48}
                      src="./images/logo/auth-logo.svg"
                      alt="Logo"
                    />
                  </Link>
                  <p className="text-center text-gray-400 dark:text-white/60">
                    Free and Open-Source Tailwind CSS Admin Dashboard Template
                  </p>
                </div>
              </div>
            </div>

            <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
              <ThemeTogglerTwo />
            </div>
          </div>
        </ThemeProvider>
      </div>
    </NextIntlClientProvider>
  );
}
