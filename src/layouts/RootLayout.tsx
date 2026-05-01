import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const navLinks = [
  { to: "/", label: "Dashboard" },
  { to: "/clients", label: "Clients" },
  { to: "/credits", label: "Credits" },
  { to: "/relationships", label: "Relationships" },
];

export default function RootLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="flex items-center gap-6 bg-white px-8 py-4 shadow-sm">
        <span className="mr-4 text-lg font-semibold">FAM Roster Hub</span>
        {navLinks.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
          >
            {label}
          </Link>
        ))}

        <div className="ml-auto flex items-center gap-3">
          {user?.email && (
            <span className="text-xs text-gray-400">{user.email}</span>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="text-xs text-gray-500 hover:text-red-600 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </nav>
      <Outlet />
    </div>
  );
}
