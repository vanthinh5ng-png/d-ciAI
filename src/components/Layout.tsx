import { Outlet, Link, useLocation } from 'react-router';
import { Home, Camera, MessageSquare, Package } from 'lucide-react';
import clsx from 'clsx';

export default function Layout() {
  const location = useLocation();
  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Khám phá', path: '/inventory', icon: Package },
    { name: 'Scan', path: '/scan', icon: Camera, primary: true },
    { name: 'Trợ lý AI', path: '/chat', icon: MessageSquare },
  ];

  return (
    <>
      <div className="flex-[1] overflow-y-auto pb-4">
        <Outlet />
      </div>
      <nav className="fixed bottom-0 left-0 w-full md:max-w-md md:left-1/2 md:-translate-x-1/2 bg-white border-t border-gray-200 safe-area-bottom pb-env z-50">
        <div className="flex items-center justify-around p-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                "flex flex-col items-center justify-center w-16 p-2 rounded-xl transition-all",
                item.primary 
                  ? "bg-blue-600 text-white -mt-8 shadow-lg shadow-blue-200 h-16 rounded-full" 
                  : location.pathname === item.path ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <item.icon size={item.primary ? 28 : 24} />
              {!item.primary && <span className="text-[10px] mt-1 font-medium">{item.name}</span>}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
