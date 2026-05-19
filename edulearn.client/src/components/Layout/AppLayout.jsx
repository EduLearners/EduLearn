import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function AppLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const location = useLocation();

    return (
        <div>
            <Navbar sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(prev => !prev)} />
            <div className="d-flex" style={{ marginTop: '56px', height: 'calc(100vh - 56px)' }}>
                <Sidebar collapsed={!sidebarOpen} onToggle={() => setSidebarOpen(prev => !prev)} />
                <main className="flex-grow-1 p-4" style={{ overscrollBehavior: 'none', overflowY: 'auto', overflowX: 'hidden', minWidth: 0, transition: 'margin-left 0.3s ease', borderRadius: '16px 0 0 16px', background: '#f5f6fa' }}>
                    <div key={location.pathname} className="page-transition">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
