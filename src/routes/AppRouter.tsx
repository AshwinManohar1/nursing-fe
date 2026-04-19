import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "../containers/Dashboard";
import SettingsPage from "../containers/SettingsPage";
import RosterPage from "../containers/RosterPage";
import LoginPage from "../containers/LoginPage";
import PrivacyPolicyPage from "../containers/PrivacyPolicyPage";
import TermsOfServicePage from "../containers/TermsOfServicePage";
import AccessibilityPage from "../containers/AccessibilityPage";
import ProtectedRoute from "../components/ProtectedRoute";

const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />
      <Route path="/accessibility" element={<AccessibilityPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route 
        path="/roster" 
        element={
          <ProtectedRoute>
            <RosterPage />
          </ProtectedRoute>
        } 
      />
      <Route path="/generated-roster" element={<Navigate to="/roster" replace />} />
      <Route 
        path="/settings" 
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN', 'WARD_INCHARGE']}>
            <SettingsPage />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
};

export default AppRouter;