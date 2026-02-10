import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CallProvider } from './context/CallContext';
import { RequireAuth } from './components/auth/RequireAuth';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import MainLayout from './components/layouts/MainLayout';
import ChatWelcome from './pages/ChatWelcome';
import ChatRoom from './pages/ChatRoom';
import Profile from './pages/Profile';

function App() {
  return (
    <Router>
      <AuthProvider>
        <CallProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <RequireAuth>
                  <MainLayout />
                </RequireAuth>
              }
            >
              <Route index element={<ChatWelcome />} />
              <Route path="chat/:roomId" element={<ChatRoom />} />
              <Route path="dashboard" element={<Dashboard />} />
            </Route>

            {/* Profile Route (separate from MainLayout for full-page experience) */}
            <Route
              path="/profile"
              element={
                <RequireAuth>
                  <Profile />
                </RequireAuth>
              }
            />

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CallProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
