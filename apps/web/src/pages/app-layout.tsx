import { Outlet } from 'react-router-dom';
import { SidebarNav } from '../components/organisms/sidebar-nav.js';

export function AppLayout(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-surface">
      <SidebarNav />
      <main className="mx-auto max-w-7xl px-4 pb-20 md:ml-[72px] md:pb-0 lg:ml-64 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
