import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import About from './pages/About';
import Technology from './pages/Technology';
import Rescue from './pages/Rescue';
import Contact from './pages/Contact';
import Dashboard from './pages/Dashboard';
import { RescueProvider } from './context/RescueContext';

function App() {
  return (
    <RescueProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            {/* Main Navigation Routes matching the editorial design */}
            <Route path="our-story" element={<About />} />
            <Route path="about" element={<About />} />
            <Route path="technology" element={<Technology />} />
            <Route path="dine" element={<Technology />} />
            <Route path="victims" element={<Rescue />} />
            <Route path="rescue" element={<Rescue />} />
            <Route path="socialize" element={<Rescue />} />
            <Route path="contact" element={<Contact />} />
          </Route>
          {/* Operations Command Dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </RescueProvider>
  );
}

export default App;
