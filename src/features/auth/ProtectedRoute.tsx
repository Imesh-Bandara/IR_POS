import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { useAuthStore } from "./auth.store";

export function ProtectedRoute() {
  const { token, isAuthenticated, setAuth, clearAuth } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function verifySession() {
      if (!token) {
        setIsChecking(false);
        return;
      }
      
      try {
        const response: any = await invoke("check_session", { token });
        setAuth(response.token, response.user, response.permissions);
      } catch (e) {
        clearAuth();
      } finally {
        setIsChecking(false);
      }
    }
    
    verifySession();
  }, [token, setAuth, clearAuth]);

  if (isChecking) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 font-medium">Loading session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
