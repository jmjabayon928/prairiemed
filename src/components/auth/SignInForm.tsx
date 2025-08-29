// src/components/auth/SignInForm.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth/useAuth";
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';

export default function SignInForm() {
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const email = String(fd.get("email") || "");
      const password = String(fd.get("password") || "");
      await login(email, password, remember);
      router.replace("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : tCommon("errors.generic"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      {/* top row with language picker */}
      <div className="w-full max-w-md sm:pt-10 mx-auto mb-5 flex justify-end">
        <LanguageSwitcher />
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              {tAuth("signin.title")}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {tAuth("signin.subtitle")}
            </p>
          </div>

          <div>
            {/* Social sign-in placeholders (disabled for now) */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-3 py-3 text-sm font-normal text-gray-700 transition-colors bg-gray-100 rounded-lg px-7 hover:bg-gray-200 hover:text-gray-800 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10"
                disabled
                title={tCommon("comingSoon")}
              >
                {/* Simple G icon */}
                <span className="inline-grid place-items-center text-lg">G</span>
                {tAuth("signin.withGoogle")}
              </button>

              <button
                type="button"
                className="inline-flex items-center justify-center gap-3 py-3 text-sm font-normal text-gray-700 transition-colors bg-gray-100 rounded-lg px-7 hover:bg-gray-200 hover:text-gray-800 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10"
                disabled
                title={tCommon("comingSoon")}
              >
                <span className="inline-grid place-items-center text-lg">X</span>
                {tAuth("signin.withX")}
              </button>
            </div>

            <div className="relative py-3 sm:py-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-800" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="p-2 text-gray-400 bg-white dark:bg-gray-900 sm:px-5 sm:py-2">
                  {tCommon("or")}
                </span>
              </div>
            </div>

            <form onSubmit={onSubmit}>
              <div className="space-y-6">
                <div>
                  <Label>
                    {tAuth("email")} <span className="text-error-500">*</span>
                  </Label>
                  <Input
                    name="email"
                    placeholder="admin@prairiemed.local"
                    type="email"
                    required
                  />
                </div>

                <div>
                  <Label>
                    {tAuth("password")} <span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={tAuth("passwordPlaceholder")}
                      required
                    />
                    {/* Two-button approach prevents a11y lint error about expressions in aria-pressed */}
                    {showPassword ? (
                      <button
                        type="button"
                        aria-pressed="true"
                        aria-label={tAuth("togglePassword.hide")}
                        className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2 text-gray-500 dark:text-gray-400"
                        onClick={() => setShowPassword(false)}
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        aria-pressed="false"
                        aria-label={tAuth("togglePassword.show")}
                        className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2 text-gray-500 dark:text-gray-400"
                        onClick={() => setShowPassword(true)}
                      >
                        <EyeOff className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={remember} onChange={setRemember} />
                    <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                      {tAuth("remember")}
                    </span>
                  </div>
                  <Link
                    href="/reset-password"
                    className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
                  >
                    {tAuth("forgot")}
                  </Link>
                </div>

                {error && (
                  <div className="text-sm text-red-600" role="alert">
                    {error}
                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? tAuth("signin.submitting") : tAuth("signin.submit")}
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-5">
              <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                {tAuth.rich("noAccount", {
                  signup: (chunks) => (
                    <Link
                      href="/signup"
                      className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                    >
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
