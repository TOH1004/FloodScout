import { Outlet, useLocation } from 'react-router-dom';
import Footer from './Footer';

export default function Layout() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className={`min-h-screen ${isHome ? 'bg-white' : 'bg-[#F3ECDE]'} text-[#183451] flex flex-col font-sans ${isHome ? 'selection:bg-[#27b1ff]/20 selection:text-[#27b1ff]' : 'selection:bg-[#D4AF83] selection:text-[#183451]'}`}>
      {/* Main Page Content */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer only on non-home sub-pages */}
      {!isHome && <Footer />}
    </div>
  );
}
