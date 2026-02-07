import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        {/* App routes and components will go here */}
        <h1 className="text-2xl font-bold text-center pt-8">VChat V2</h1>
        <p className="text-center text-gray-600 mt-2">Authentication configured ✓</p>
      </div>
    </AuthProvider>
  );
}

export default App;
