import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#162347] flex flex-col font-sans selection:bg-[#BED6EE] selection:text-[#162347]">
      <Navbar />

      {/* Main Page Content */}
      <main className="flex-grow">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
