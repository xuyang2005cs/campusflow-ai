import { CalendarCheck, CheckCircle, Gear, ListChecks, Tray } from '@phosphor-icons/react';
import { NavLink, Outlet } from 'react-router-dom';

const navigation = [
  { to: '/today', label: '今日', icon: CalendarCheck },
  { to: '/inbox', label: '收件箱', icon: Tray },
  { to: '/tasks', label: '待办', icon: ListChecks },
  { to: '/completed', label: '完成', icon: CheckCircle },
  { to: '/settings', label: '设置', icon: Gear },
];

export function AppShell() {
  return (
    <div className="app-shell">
      <aside className="desktop-rail" aria-label="主导航">
        <div className="rail-brand" aria-label="CampusFlow AI"><span>CF</span><strong>CampusFlow</strong></div>
        <nav>
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `rail-link${isActive ? ' is-active' : ''}`}>
              <Icon size={22} weight="regular" aria-hidden="true" /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main id="main-content" className="app-main" tabIndex={-1}><Outlet /></main>
      <nav className="bottom-nav" aria-label="主导航">
        {navigation.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `bottom-nav__item${isActive ? ' is-active' : ''}`}>
            <Icon size={23} weight="regular" aria-hidden="true" /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

