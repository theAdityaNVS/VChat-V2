import { useCall } from '../../context/CallContext';

const IncomingCallModal = () => {
  const { incomingCalls, acceptCall, rejectCall } = useCall();

  if (incomingCalls.length === 0) {
    return null;
  }

  // Show the most recent incoming call
  const call = incomingCalls[0];

  const handleAccept = async () => {
    try {
      await acceptCall(call.id);
    } catch (error) {
      console.error('Failed to accept call:', error);
    }
  };

  const handleReject = async () => {
    try {
      await rejectCall(call.id);
    } catch (error) {
      console.error('Failed to reject call:', error);
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-2xl p-6 w-96 animate-bounce-in">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {call.callerAvatar ? (
            <img
              src={call.callerAvatar}
              alt={call.callerName}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-semibold">
              {call.callerName[0].toUpperCase()}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{call.callerName}</h3>
          <p className="text-sm text-gray-600 mt-1">Incoming video call...</p>

          {/* Actions */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleAccept}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              Accept
            </button>
            <button
              onClick={handleReject}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z"
                />
              </svg>
              Reject
            </button>
          </div>
        </div>
      </div>

      {/* Ringing animation */}
      <style>{`
        @keyframes bounce-in {
          0% {
            transform: translateY(-100px);
            opacity: 0;
          }
          60% {
            transform: translateY(10px);
            opacity: 1;
          }
          100% {
            transform: translateY(0);
          }
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default IncomingCallModal;
