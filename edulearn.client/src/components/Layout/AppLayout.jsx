import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function AppLayout() {
    return (
        <div className="d-flex flex-column min-vh-100">
            <Navbar />
            <div className="d-flex flex-grow-1">
                <Sidebar />
                <main className="flex-grow-1 p-4" style={{ minWidth: 0, overflowX: 'auto' }}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}