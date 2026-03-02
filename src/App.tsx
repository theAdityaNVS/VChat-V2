import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CallProvider, useCall } from './context/CallContext';
import { ThemeProvider } from './context/ThemeContext';
import { RequireAuth } from './components/auth/RequireAuth';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import MainLayout from './components/layouts/MainLayout';
import ChatWelcome from './pages/ChatWelcome';
import ChatRoom from './pages/ChatRoom';
import Profile from './pages/Profile';
import CallHistory from './pages/CallHistory';
import IncomingCallModal from './components/video/IncomingCallModal';
import VideoCallModal from './components/video/VideoCallModal';
import { useAuth } from './hooks/useAuth';

/**
 * Global call modals rendered inside CallProvider so they survive
 * route changes (e.g. navigating to /profile during an active call).
 */
function GlobalCallModals() {
  const { currentCall } = useCall();
  const { currentUser } = useAuth();

  const showVideoCall =
    !!currentCall &&
    !!currentUser &&
    (currentCall.status === 'ringing' || currentCall.status === 'connected');

  return (
    <>
      <IncomingCallModal />
      {showVideoCall && currentCall && currentUser && (
        <VideoCallModal
          callId={currentCall.id}
          isInitiator={currentCall.callerId === currentUser.uid}
          onClose={() => {
            /* Modal auto-closes via currentCall status change */
          }}
        />
      )}
    </>
  );
}

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <CallProvider>
            <GlobalCallModals />
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
                <Route path="calls" element={<CallHistory />} />
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
      </ThemeProvider>
    </Router>
  );
}

export default App;
