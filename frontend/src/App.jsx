import { Navigate, Route, Routes } from 'react-router-dom';
import { Shell } from './components/Shell.jsx';
import { useStore } from './store/Store.jsx';
import { AssistantPage } from './pages/Assistant.jsx';
import { AuthPage } from './pages/Auth.jsx';
import { CalendarPage } from './pages/Calendar.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { HealthPage } from './pages/Health.jsx';
import { MobilePage } from './pages/Mobile.jsx';
import { NotesPage } from './pages/Notes.jsx';
import { ProfilePage } from './pages/Profile.jsx';
import { ReportsPage } from './pages/Reports.jsx';
import { SchedulerPage } from './pages/Scheduler.jsx';
import { SettingsPage } from './pages/Settings.jsx';
import { SkillsPage } from './pages/Skills.jsx';
import { TasksPage } from './pages/Tasks.jsx';
import { WelcomePage } from './pages/Welcome.jsx';

export function App() {
  const { db, vault } = useStore();
  if (!db.sessionUserId || !vault) return <AuthPage />;
  return (
    <Shell>
      <Routes>
        {!vault.profile.onboarded ? (
          <Route path="*" element={<WelcomePage />} />
        ) : (
          <>
            <Route path="/" element={<Dashboard />} />
            <Route path="/scheduler" element={<SchedulerPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/skills" element={<SkillsPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/health" element={<HealthPage />} />
            <Route path="/mobile" element={<MobilePage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </Shell>
  );
}
