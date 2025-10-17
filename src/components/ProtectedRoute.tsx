import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireOnboarding?: boolean;
}

export const ProtectedRoute = ({ 
  children, 
  requireAuth = true,
  requireOnboarding = true 
}: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);

  useEffect(() => {
    if (user && requireOnboarding) {
      setTimeout(() => {
        supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            setOnboardingComplete(data?.onboarding_completed ?? false);
          });
      }, 0);
    }
  }, [user, requireOnboarding]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>;
  }

  if (requireAuth && !user) {
    return <Navigate to="/auth" replace />;
  }

  if (requireOnboarding && onboardingComplete === false) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};
