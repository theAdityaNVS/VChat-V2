import { useEffect, useRef, useState, useCallback } from 'react';
import {
  subscribeToSignals,
  subscribeToCall,
  sendOffer,
  sendAnswer,
  sendIceCandidate,
} from '../lib/callService';
import type { MediaType } from '../types/call';

// STUN servers for NAT traversal
const ICE_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }],
};

interface UseVideoCallProps {
  callId: string | null;
  userId: string;
  isInitiator: boolean;
  mediaType?: MediaType; // 'audio' or 'video'
  onRemoteStream?: (stream: MediaStream) => void;
  onCallEnded?: () => void;
}

interface UseVideoCallReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;
  startCall: () => Promise<void>;
  endCall: () => void;
}

export const useVideoCall = ({
  callId,
  userId,
  isInitiator,
  mediaType = 'video',
  onRemoteStream,
  onCallEnded,
}: UseVideoCallProps): UseVideoCallReturn => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(mediaType === 'video');
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);

  // Get remote user ID from call
  const remoteUserId = useRef<string>('');

  // Track processed signals to avoid reprocessing
  const processedSignalsRef = useRef<Set<string>>(new Set());

  // Queue for ICE candidates that arrive before remote description is set
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);

  // Set remote user ID from the call document
  useEffect(() => {
    if (!callId || !userId) return;

    const unsubscribe = subscribeToCall(callId, (call) => {
      if (call) {
        // Set remote user ID from the call document
        const remoteId = call.callerId === userId ? call.calleeId : call.callerId;
        if (remoteId !== remoteUserId.current) {
          console.log('useVideoCall - Setting remote user ID:', remoteId);
          remoteUserId.current = remoteId;
        }
      }
    });

    return () => unsubscribe();
  }, [callId, userId]);

  /**
   * Initialize local media stream
   */
  const initLocalStream = useCallback(async () => {
    try {
      console.log(`Requesting ${mediaType} media stream...`);

      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: mediaType === 'video' ? { width: 1280, height: 720 } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Media stream acquired:', {
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length,
      });

      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          throw new Error(
            'Camera/microphone permission denied. Please allow access and try again.'
          );
        } else if (error.name === 'NotFoundError') {
          throw new Error('No camera/microphone found on this device.');
        }
      }
      throw new Error('Failed to access camera/microphone');
    }
  }, [mediaType]);

  /**
   * Initialize peer connection
   */
  const initPeerConnection = useCallback(
    async (stream: MediaStream) => {
      if (!callId) return null;

      const peerConnection = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = peerConnection;

      // Add local stream tracks to peer connection
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      // Handle incoming tracks
      peerConnection.ontrack = (event) => {
        const [remoteStream] = event.streams;
        setRemoteStream(remoteStream);
        if (onRemoteStream) {
          onRemoteStream(remoteStream);
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && callId && remoteUserId.current) {
          sendIceCandidate(callId, userId, remoteUserId.current, {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
          });
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);
        if (
          peerConnection.connectionState === 'disconnected' ||
          peerConnection.connectionState === 'failed' ||
          peerConnection.connectionState === 'closed'
        ) {
          if (onCallEnded) {
            onCallEnded();
          }
        }
      };

      return peerConnection;
    },
    [callId, userId, onRemoteStream, onCallEnded]
  );

  /**
   * Start the call (for initiator)
   */
  const startCall = useCallback(async () => {
    if (!callId || !isInitiator) return;

    console.log('useVideoCall - startCall: Initiating call setup');

    try {
      const stream = await initLocalStream();
      const peerConnection = await initPeerConnection(stream);

      if (!peerConnection) {
        console.error('useVideoCall - startCall: Failed to create peer connection');
        return;
      }

      console.log('useVideoCall - startCall: Creating offer, remote user:', remoteUserId.current);

      // Create and send offer
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      await peerConnection.setLocalDescription(offer);

      if (remoteUserId.current) {
        console.log('useVideoCall - startCall: Sending offer to:', remoteUserId.current);
        await sendOffer(callId, userId, remoteUserId.current, {
          sdp: offer.sdp || '',
          type: 'offer',
        });
      } else {
        console.error('useVideoCall - startCall: No remote user ID available yet');
      }
    } catch (error) {
      console.error('Error starting call:', error);
      throw error;
    }
  }, [callId, isInitiator, userId, initLocalStream, initPeerConnection]);

  /**
   * Handle incoming signals
   */
  useEffect(() => {
    if (!callId) return;

    console.log('useVideoCall - Setting up signal subscription for call:', callId);

    const unsubscribe = subscribeToSignals(callId, userId, async (signal) => {
      try {
        console.log('useVideoCall - Received signal:', signal.type, 'from:', signal.senderId);

        // Skip if already processed using document ID
        if (processedSignalsRef.current.has(signal.id)) {
          console.log('useVideoCall - Skipping duplicate signal:', signal.id);
          return;
        }

        // Mark as processed
        processedSignalsRef.current.add(signal.id);

        // Set remote user ID
        remoteUserId.current = signal.senderId;

        // Initialize peer connection if not already done
        if (!peerConnectionRef.current) {
          console.log('useVideoCall - Initializing peer connection for incoming signal');
          const stream = await initLocalStream();
          await initPeerConnection(stream);
        }

        const peerConnection = peerConnectionRef.current;
        if (!peerConnection) {
          console.error('useVideoCall - No peer connection available');
          return;
        }

        if (signal.type === 'offer' && signal.offer) {
          const signalingState = peerConnection.signalingState;

          // Skip if we already have a remote description from this offer
          if (
            peerConnection.remoteDescription &&
            peerConnection.remoteDescription.type === 'offer'
          ) {
            console.log('useVideoCall - Skipping duplicate offer');
            return;
          }

          // Only process offer if we're in the right state
          if (signalingState !== 'stable' && signalingState !== 'have-local-offer') {
            console.log('useVideoCall - Skipping offer, wrong state:', signalingState);
            return;
          }

          console.log('useVideoCall - Processing offer');
          // Handle incoming offer
          await peerConnection.setRemoteDescription(
            new RTCSessionDescription({
              type: 'offer',
              sdp: signal.offer.sdp,
            })
          );

          // Process any queued ICE candidates
          if (iceCandidateQueueRef.current.length > 0) {
            console.log(
              'useVideoCall - Processing',
              iceCandidateQueueRef.current.length,
              'queued ICE candidates'
            );
            for (const candidate of iceCandidateQueueRef.current) {
              await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            }
            iceCandidateQueueRef.current = [];
          }

          // Create and send answer
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);

          console.log('useVideoCall - Sending answer to:', signal.senderId);
          await sendAnswer(callId, userId, signal.senderId, {
            sdp: answer.sdp || '',
            type: 'answer',
          });
        } else if (signal.type === 'answer' && signal.answer) {
          const signalingState = peerConnection.signalingState;

          // Skip if we already have a remote description (answer already processed)
          if (peerConnection.remoteDescription) {
            console.log('useVideoCall - Skipping answer, remote description already set');
            return;
          }

          // Only process answer if we have a local offer
          if (signalingState !== 'have-local-offer') {
            console.log('useVideoCall - Skipping answer, wrong state:', signalingState);
            return;
          }

          console.log('useVideoCall - Processing answer');
          // Handle incoming answer
          await peerConnection.setRemoteDescription(
            new RTCSessionDescription({
              type: 'answer',
              sdp: signal.answer.sdp,
            })
          );

          // Process any queued ICE candidates
          if (iceCandidateQueueRef.current.length > 0) {
            console.log(
              'useVideoCall - Processing',
              iceCandidateQueueRef.current.length,
              'queued ICE candidates'
            );
            for (const candidate of iceCandidateQueueRef.current) {
              await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            }
            iceCandidateQueueRef.current = [];
          }
        } else if (signal.type === 'ice-candidate' && signal.iceCandidate) {
          console.log('useVideoCall - Processing ICE candidate');

          const candidate: RTCIceCandidateInit = {
            candidate: signal.iceCandidate.candidate,
            sdpMid: signal.iceCandidate.sdpMid,
            sdpMLineIndex: signal.iceCandidate.sdpMLineIndex,
          };

          // Check if remote description is set
          if (!peerConnection.remoteDescription) {
            console.log('useVideoCall - Queueing ICE candidate (no remote description yet)');
            iceCandidateQueueRef.current.push(candidate);
          } else {
            // Add ICE candidate immediately
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          }
        }
      } catch (error) {
        console.error('Error handling signal:', error);
      }
    });

    return () => {
      console.log('useVideoCall - Cleaning up signal subscription');
      unsubscribe();
    };
  }, [callId, userId, initLocalStream, initPeerConnection]);

  /**
   * Toggle audio
   */
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, [localStream]);

  /**
   * Toggle video
   */
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, [localStream]);

  /**
   * Stop screen sharing and restore camera
   */
  const stopScreenShare = useCallback(async () => {
    if (!localStream || !peerConnectionRef.current || !originalVideoTrackRef.current) return;

    try {
      const sender = peerConnectionRef.current.getSenders().find((s) => s.track?.kind === 'video');

      if (sender) {
        await sender.replaceTrack(originalVideoTrackRef.current);
        localStream.removeTrack(localStream.getVideoTracks()[0]);
        localStream.addTrack(originalVideoTrackRef.current);
        setIsScreenSharing(false);
        originalVideoTrackRef.current = null;
      }
    } catch (error) {
      console.error('Error stopping screen share:', error);
    }
  }, [localStream]);

  /**
   * Toggle screen sharing
   */
  const toggleScreenShare = useCallback(async () => {
    if (!localStream || !peerConnectionRef.current) return;

    try {
      if (isScreenSharing) {
        // Stop screen sharing, restore camera
        await stopScreenShare();
      } else {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });

        const screenTrack = screenStream.getVideoTracks()[0];
        const currentVideoTrack = localStream.getVideoTracks()[0];

        // Save original video track
        originalVideoTrackRef.current = currentVideoTrack;

        // Replace video track with screen track
        const sender = peerConnectionRef.current
          .getSenders()
          .find((s) => s.track?.kind === 'video');

        if (sender) {
          await sender.replaceTrack(screenTrack);
          localStream.removeTrack(currentVideoTrack);
          localStream.addTrack(screenTrack);
          setIsScreenSharing(true);

          // Handle when user stops sharing via browser UI
          screenTrack.onended = () => {
            stopScreenShare();
          };
        }
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
    }
  }, [localStream, isScreenSharing, stopScreenShare]);

  /**
   * End call and cleanup
   */
  const endCall = useCallback(() => {
    console.log('useVideoCall - endCall() called');
    // Stop all tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);
    setIsAudioEnabled(true);
    setIsVideoEnabled(true);
    setIsScreenSharing(false);

    if (onCallEnded) {
      console.log('useVideoCall - Calling onCallEnded callback');
      onCallEnded();
    }
  }, [localStream, onCallEnded]);

  // Cleanup on unmount only (not when endCall changes)
  useEffect(() => {
    const processedSignals = processedSignalsRef.current;
    const iceCandidateQueue = iceCandidateQueueRef.current;

    return () => {
      console.log('useVideoCall - Cleaning up on unmount');
      // Stop all tracks
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }

      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      // Clear processed signals and ICE candidate queue
      processedSignals.clear();
      iceCandidateQueue.length = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on unmount

  return {
    localStream,
    remoteStream,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    startCall,
    endCall,
  };
};
