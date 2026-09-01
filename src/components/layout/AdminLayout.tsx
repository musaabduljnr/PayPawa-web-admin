import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export const AdminLayout: React.FC = () => {
  return (
    <div className="admin-app">
      <Sidebar />
      <div className="admin-main-wrapper">
        <Topbar />
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
