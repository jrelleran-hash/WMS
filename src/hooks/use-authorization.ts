
"use client";

import { useMemo } from 'react';
import { useAuth } from './use-auth';
import type { PagePermission } from '@/types';
import { navItemsPermissions } from '@/components/layout/sidebar';
import { useRouter } from 'next/navigation';

interface UseAuthorizationProps {
  page: PagePermission;
}

export const useAuthorization = ({ page }: UseAuthorizationProps) => {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  const canView = useMemo(() => {
    if (loading) return false; // Don't grant access while loading
    if (!userProfile) return false;
    if (userProfile.role === 'Admin' || userProfile.role === 'Manager') {
      return true;
    }
    return userProfile.permissions?.includes(page) ?? false;
  }, [userProfile, loading, page]);

  const canManage = useMemo(() => {
    if (loading || !userProfile) return false;
    return userProfile.role === 'Admin' || userProfile.role === 'Manager';
  }, [userProfile, loading]);

  return { canView, canManage };
};
