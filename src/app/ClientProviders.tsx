'use client';

import {SidebarProvider} from '@/context/SidebarContext';
import {ThemeProvider} from '@/context/ThemeContext';
import AuthProvider from '@/components/auth/AuthProvider';

export default function ClientProviders({children}: {children: React.ReactNode}) {
  return (
    <ThemeProvider>
      <SidebarProvider>
        <AuthProvider>{children}</AuthProvider>
      </SidebarProvider>
    </ThemeProvider>
  );
}
