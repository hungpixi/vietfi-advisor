"use client";

import { useEffect, useState } from "react";
import { UserRole } from "@/lib/rbac";
import { getGamification } from "@/lib/gamification";

interface RequireTierProps {
  requiredRole: UserRole;
  featureName: string;
  children: React.ReactNode;
}

/**
 * RequireTier component - Global Unlock Version
 * 
 * Previously restricted content based on user XP/Tier.
 * Following user request, this now allows unconditional access while 
 * maintaining the standard mounting behavior to prevent hydration mismatches.
 */
export default function RequireTier({ children }: RequireTierProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsClient(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  if (!isClient) {
    // Return skeleton or null during SSR to avoid hydration mismatch
    return <div className="animate-pulse bg-white/5 h-64 rounded-xl w-full"></div>;
  }

  // Always return children - mechanism unlocked globally
  return <>{children}</>;
}
