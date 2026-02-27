import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';

export const Dashboard: React.FC = () => {
  const { userDoc, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">VChat V2</h1>
          </div>
          <div className="flex items-center gap-4">
            {userDoc && (
              <>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {userDoc.displayName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{userDoc.email}</p>
                </div>
                {userDoc.photoURL && (
                  <img
                    src={userDoc.photoURL}
                    alt={userDoc.displayName}
                    className="h-10 w-10 rounded-full"
                  />
                )}
              </>
            )}
            <Button onClick={handleLogout} variant="secondary">
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to VChat V2
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Phase 1 Foundation & Authentication is complete! ✅
          </p>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Coming next: Room management and real-time messaging
          </p>
        </div>
      </main>
    </div>
  );
};
