import Navbar from './Navbar';
import Sidebar from './Sidebar';
import ConnectivityBanner from '../ConnectivityBanner';
import RoleGuardedOutlet from '../RoleGuardedOutlet';

export default function AppLayout() {
    return (
        <div className="d-flex flex-column" style={{ height: '100vh' }}>
            <Navbar />
            <ConnectivityBanner />
            <div className="d-flex flex-grow-1" style={{ overflow: 'hidden' }}>
                <aside style={{ width: 240, flexShrink: 0, overflowY: 'auto', height: '100%', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    <Sidebar />
                </aside>
                <main className="flex-grow-1 p-4" style={{ overflowY: 'auto', height: '100%', isolation: 'auto' }}>
                    <RoleGuardedOutlet />
                </main>
            </div>
        </div>
    );
}