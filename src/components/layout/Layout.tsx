import { Outlet, useLocation } from 'react-router-dom';
import Footer from './Footer';

export default function Layout() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className={`min-h-screen ${isHome ? 'bg-[#F3ECDE]' : 'bg-[#F3ECDE]'} text-[#183451] flex flex-col font-sans selection:bg-[#D4AF83] selection:text-[#183451]`}>
      {/* Main Page Content */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer only on non-home sub-pages */}
      {!isHome && <Footer />}
    </div>
  );
}
