import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";
import RootLayout from "./layouts/RootLayout";
import DashboardPage from "./pages/DashboardPage";
import ClientListPage from "./pages/ClientListPage";
import ClientProfilePage from "./pages/ClientProfilePage";
import CreditsPage from "./pages/CreditsPage";
import RelationshipsPage from "./pages/RelationshipsPage";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<RootLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/clients" element={<ClientListPage />} />
              <Route path="/clients/:id" element={<ClientProfilePage />} />
              <Route path="/credits" element={<CreditsPage />} />
              <Route path="/relationships" element={<RelationshipsPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
