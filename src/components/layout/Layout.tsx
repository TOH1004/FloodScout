import { Outlet, useLocation } from 'react-router-dom';
import Footer from './Footer';

export default function Layout() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className={`min-h-screen ${isHome ? 'bg-[#060d14]' : 'bg-[#FAF7F2]'} text-[#162347] flex flex-col font-sans selection:bg-[#7BD7FF] selection:text-[#162347]`}>
      {/* Main Page Content */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer only on non-home sub-pages */}
      {!isHome && <Footer />}
    </div>
  );
}
