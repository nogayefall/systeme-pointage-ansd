import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Avatar, Icon } from '../ui';
import { fullName } from '../../utils/formatters';
import { navigationFor } from './navigation';
import './layout.css';

export default function Sidebar({ user, open, onNavigate }) {
  const navRef = useRef(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const updateScrollHint = useCallback(() => {
    const nav = navRef.current;
    setCanScrollDown(Boolean(nav && nav.scrollTop + nav.clientHeight < nav.scrollHeight - 2));
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return undefined;

    updateScrollHint();
    window.addEventListener('resize', updateScrollHint);
    const resizeObserver = new ResizeObserver(updateScrollHint);
    resizeObserver.observe(nav);

    return () => {
      window.removeEventListener('resize', updateScrollHint);
      resizeObserver.disconnect();
    };
  }, [updateScrollHint, user]);

  const scrollMenuDown = () => {
    navRef.current?.scrollBy({ top: navRef.current.clientHeight * 0.7, behavior: 'smooth' });
  };

  return (
    <aside className={`sidebar${open ? ' is-open' : ''}`} aria-label="Navigation principale">
      <div className="sidebar-brand">
        <span className="brand-tile"><img src="/images/ansd-logo.png" alt="Logo ANSD" /></span>
        <div className="sidebar-brand-name">
          <strong>Pointage</strong>
          <span>ANSD</span>
        </div>
      </div>

      <nav ref={navRef} className="sidebar-nav" aria-label="Menu de l’application" onScroll={updateScrollHint}>
        {navigationFor(user).map((group) => (
          <div className="nav-group" key={group.title}>
            <span className="nav-title">{group.title}</span>
            {group.items.map((entry) => (
              <NavLink
                key={entry.to}
                to={entry.to}
                end={entry.end}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                onClick={onNavigate}
              >
                <Icon name={entry.icon} size={19} />
                <span>{entry.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
        {canScrollDown && (
          <button
            type="button"
            className="sidebar-scroll-hint"
            onClick={scrollMenuDown}
            aria-label="Faire défiler le menu vers le bas"
          >
            <Icon name="chevronRight" size={18} />
          </button>
        )}
      </nav>

      <div className="sidebar-user">
        <Avatar user={user} size={40} />
        <div className="sidebar-user-text">
          <strong>{fullName(user)}</strong>
          <span>{user?.role || '—'}</span>
        </div>
      </div>
    </aside>
  );
}
