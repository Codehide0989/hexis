import { Navigate } from 'react-router-dom';
import { isAdminAuthenticated } from '../lib/adminAuth';

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  if (!isAdminAuthenticated()) {
    return <Navigate to="/admin/login" replace />;
  }
  
  return <>{children}</>;
}
