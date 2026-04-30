import { Link, Outlet } from "react-router-dom";

const navLinks = [
  { to: "/", label: "Dashboard" },
  { to: "/clients", label: "Clients" },
  { to: "/credits", label: "Credits" },
  { to: "/relationships", label: "Relationships" },
];

export default function RootLayout() {
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
      </nav>
      <Outlet />
    </div>
  );
}
