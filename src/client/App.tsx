import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { CompletedPage } from './pages/CompletedPage';
import { InboxPage } from './pages/InboxPage';
import { ReviewPage } from './pages/ReviewPage';
import { SettingsPage } from './pages/SettingsPage';
import { TasksPage } from './pages/TasksPage';
import { TodayPage } from './pages/TodayPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/today" replace />} />
      <Route element={<AppShell />}>
        <Route path="/today" element={<TodayPage />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/completed" element={<CompletedPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="/review/:id" element={<ReviewPage />} />
      <Route path="*" element={<Navigate to="/today" replace />} />
    </Routes>
  );
}

