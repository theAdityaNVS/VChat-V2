import { useEffect, useRef, useState } from 'react';
import { useCall } from '../../context/CallContext';
import { useAuth } from '../../hooks/useAuth';
import { useVideoCall } from '../../hooks/useVideoCall';
import CallControls from './CallControls';

interface VideoCallModalProps {
  callId: string;
  isInitiator: boolean;
  onClose: () => void;
}

const VideoCallModal = ({ callId, isInitiator, onClose }: VideoCallModalProps) => {
  console.log('VideoCallModal - Rendering with:', { callId, isInitiator });
  const { currentUser } = useAuth();
  const { currentCall, endCall } = useCall();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isRemoteVideoActive, setIsRemoteVideoActive] = useState(true);

  const isAudioOnly = currentCall?.mediaType === 'audio';
  console.log(
    'VideoCallModal - Current call status:',
    currentCall?.status,
    'Media type:',
    currentCall?.mediaType
  );

  const {
    localStream,
    remoteStream,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    startCall,
    endCall: endVideoCall,
  } = useVideoCall({
    callId,
    userId: currentUser?.uid || '',
    isInitiator,
    mediaType: currentCall?.mediaType || 'video',
    onCallEnded: () => {
      endCall();
      onClose();
    },
  });

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;

      // Monitor remote video track state
      const videoTrack = remoteStream.getVideoTracks()[0];
      if (videoTrack) {
        setIsRemoteVideoActive(videoTrack.enabled);

        // Listen for track enabled/disabled events
        videoTrack.addEventListener('mute', () => setIsRemoteVideoActive(false));
        videoTrack.addEventListener('unmute', () => setIsRemoteVideoActive(true));

        // Check if track has an enabled property change (some browsers)
        const checkInterval = setInterval(() => {
          if (videoTrack.enabled !== isRemoteVideoActive) {
            setIsRemoteVideoActive(videoTrack.enabled);
          }
        }, 500);

        return () => {
          videoTrack.removeEventListener('mute', () => setIsRemoteVideoActive(false));
          videoTrack.removeEventListener('unmute', () => setIsRemoteVideoActive(true));
          clearInterval(checkInterval);
        };
      }
    }
  }, [remoteStream, isRemoteVideoActive]);

  // Start call if initiator (only once when status becomes ringing)
  useEffect(() => {
    if (isInitiator && currentCall?.status === 'ringing') {
      console.log('VideoCallModal - Initiator starting call');
      startCall().catch((error) => {
        console.error('Failed to start call:', error);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitiator, currentCall?.status]); // Don't include startCall to prevent multiple calls

  const handleEndCall = async () => {
    console.log('VideoCallModal - User clicked end call');
    endVideoCall();
    await endCall();
    onClose();
  };

  const getCallStatusText = () => {
    if (!currentCall) return 'Connecting...';

    const callType = isAudioOnly ? 'call' : 'video call';

    switch (currentCall.status) {
      case 'ringing':
        return isInitiator ? `Calling...` : `Incoming ${callType}...`;
      case 'connected':
        return 'Connected';
      case 'ended':
        return 'Call ended';
      case 'rejected':
        return 'Call rejected';
      default:
        return 'Connecting...';
    }
  };

  const getParticipantName = () => {
    if (!currentCall || !currentUser) return '';
    return currentCall.callerId === currentUser.uid
      ? currentCall.calleeName
      : currentCall.callerName;
  };

  const getParticipantAvatar = () => {
    if (!currentCall || !currentUser) return undefined;
    return currentCall.callerId === currentUser.uid
      ? currentCall.calleeAvatar
      : currentCall.callerAvatar;
  };

  const getCurrentUserAvatar = () => {
    if (!currentCall || !currentUser) return undefined;
    return currentCall.callerId === currentUser.uid
      ? currentCall.callerAvatar
      : currentCall.calleeAvatar;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-90 z-50 flex items-center justify-center">
      <div className="w-full h-full flex flex-col">
        {/* Header */}
        <div className="p-4 bg-gray-900 text-white flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{getParticipantName()}</h2>
            <p className="text-sm text-gray-400">{getCallStatusText()}</p>
          </div>
          <button
            onClick={handleEndCall}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Video Area */}
        <div className="flex-1 relative bg-gray-900">
          {/* Remote Video (main) */}
          <div className="w-full h-full flex items-center justify-center relative">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-contain ${!remoteStream || !isRemoteVideoActive || isAudioOnly ? 'hidden' : ''}`}
            />
            {(!remoteStream || !isRemoteVideoActive || isAudioOnly) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-gradient-to-br from-gray-800 to-gray-900">
                {getParticipantAvatar() ? (
                  <img
                    src={getParticipantAvatar()}
                    alt={getParticipantName()}
                    className="w-32 h-32 rounded-full mb-4 object-cover border-4 border-gray-700"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4 text-4xl font-bold border-4 border-gray-700">
                    {getInitials(getParticipantName())}
                  </div>
                )}
                <p className="text-lg">
                  {!remoteStream
                    ? `Waiting for ${getParticipantName()}...`
                    : isAudioOnly
                      ? `Audio call with ${getParticipantName()}`
                      : `${getParticipantName()}'s camera is off`}
                </p>
              </div>
            )}
          </div>

          {/* Local Video (picture-in-picture) */}
          <div className="absolute top-4 right-4 w-64 h-48 bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            <div className="relative w-full h-full">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover mirror ${!localStream || !isVideoEnabled || isAudioOnly ? 'hidden' : ''}`}
              />
              {(!localStream || !isVideoEnabled || isAudioOnly) && (
                <div className="absolute inset-0 flex items-center justify-center text-white bg-gradient-to-br from-gray-700 to-gray-800">
                  {getCurrentUserAvatar() ? (
                    <img
                      src={getCurrentUserAvatar()}
                      alt="You"
                      className="w-20 h-20 rounded-full object-cover border-2 border-gray-600"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-2xl font-bold border-2 border-gray-600">
                      {currentUser?.displayName ? getInitials(currentUser.displayName) : 'ME'}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Status indicators */}
            <div className="absolute bottom-2 left-2 flex gap-2">
              {!isAudioEnabled && (
                <div className="bg-red-600 rounded-full p-1">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
              {!isVideoEnabled && (
                <div className="bg-red-600 rounded-full p-1">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
              {isScreenSharing && (
                <div className="bg-blue-600 rounded-full p-1">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="p-6 bg-gray-900">
          <CallControls
            isAudioEnabled={isAudioEnabled}
            isVideoEnabled={isVideoEnabled}
            isScreenSharing={isScreenSharing}
            onToggleAudio={toggleAudio}
            onToggleVideo={toggleVideo}
            onToggleScreenShare={toggleScreenShare}
            onEndCall={handleEndCall}
            hideVideoControls={isAudioOnly}
          />
        </div>
      </div>

      {/* CSS for mirror effect on local video */}
      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
};

export default VideoCallModal;
