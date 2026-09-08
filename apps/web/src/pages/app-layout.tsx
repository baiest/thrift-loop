import { Outlet } from 'react-router-dom';
import { SidebarNav } from '../components/organisms/sidebar-nav.js';

export function AppLayout(): React.JSX.Element {
  return (
    <div>
      <SidebarNav />
      <Outlet />
    </div>
  );
}
