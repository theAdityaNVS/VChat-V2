import { useEffect, useRef, useState, useCallback } from 'react';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  subscribeToSignals,
  subscribeToCall,
  sendOffer,
  sendAnswer,
  sendIceCandidate,
} from '../lib/callService';
import type { MediaType } from '../types/call';

// STUN + TURN servers for NAT traversal (TURN needed for symmetric NAT on mobile)
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
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
  isScreenSharingSupported: boolean;
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

  // Check if screen sharing is supported (not available on most mobile browsers)
  const isScreenSharingSupported =
    typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia;

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Keep a stable reference to onCallEnded to avoid re-subscriptions
  const onCallEndedRef = useRef(onCallEnded);
  useEffect(() => {
    onCallEndedRef.current = onCallEnded;
  }, [onCallEnded]);

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
        video:
          mediaType === 'video'
            ? {
                width: { ideal: 1280, min: 320 },
                height: { ideal: 720, min: 240 },
                facingMode: 'user',
              }
            : false,
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (constraintError) {
        // Fallback to basic constraints if ideal fails (common on mobile)
        console.warn(
          'Ideal constraints failed, falling back to basic constraints:',
          constraintError
        );
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: mediaType === 'video',
        });
      }

      console.log('Media stream acquired:', {
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length,
      });

      localStreamRef.current = stream;
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
        } else if (error.name === 'OverconstrainedError') {
          throw new Error('Camera does not support requested resolution. Try again.');
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
        const state = peerConnection.connectionState;
        console.log('Connection state:', state);
        // 'disconnected' is transient and can recover – ignore it.
        // 'closed' is triggered by our own endCall() – ignore it.
        // Only act on 'failed' which is a permanent unrecoverable error.
        if (state === 'failed') {
          // Stop local stream tracks to release camera/mic
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
            localStreamRef.current = null;
          }
          peerConnectionRef.current = null;
          setLocalStream(null);
          setRemoteStream(null);
          setIsAudioEnabled(true);
          setIsVideoEnabled(mediaType === 'video');
          setIsScreenSharing(false);
          if (onCallEndedRef.current) {
            onCallEndedRef.current();
          }
        }
      };

      // Fallback: monitor iceConnectionState for browsers that don't support connectionState
      peerConnection.oniceconnectionstatechange = () => {
        const iceState = peerConnection.iceConnectionState;
        console.log('ICE connection state:', iceState);

        if (iceState === 'failed') {
          // Attempt ICE restart before giving up
          console.log('ICE connection failed, attempting ICE restart...');
          peerConnection.restartIce();
        }

        if (iceState === 'disconnected') {
          // Give a grace period for reconnection (e.g., network switch on mobile)
          setTimeout(() => {
            if (peerConnection.iceConnectionState === 'disconnected') {
              console.log('ICE still disconnected after grace period, attempting restart...');
              peerConnection.restartIce();
            }
          }, 5000);
        }
      };

      return peerConnection;
    },
    [callId, userId, onRemoteStream, mediaType]
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

      // Eagerly resolve remoteUserId if the subscription hasn't fired yet
      if (!remoteUserId.current) {
        console.log('useVideoCall - startCall: remoteUserId not set yet, fetching from Firestore');
        const callSnap = await getDoc(doc(db, 'calls', callId));
        if (callSnap.exists()) {
          const data = callSnap.data();
          remoteUserId.current = data.callerId === userId ? data.calleeId : data.callerId;
          console.log('useVideoCall - startCall: Resolved remoteUserId:', remoteUserId.current);
        }
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
        console.error('useVideoCall - startCall: No remote user ID could be determined');
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
    const stream = localStreamRef.current;
    if (!stream || !peerConnectionRef.current || !originalVideoTrackRef.current) return;

    try {
      const sender = peerConnectionRef.current.getSenders().find((s) => s.track?.kind === 'video');

      if (sender) {
        // Stop the screen share track before replacing
        const screenTrack = stream.getVideoTracks()[0];
        if (screenTrack) {
          screenTrack.stop();
        }

        await sender.replaceTrack(originalVideoTrackRef.current);
        stream.removeTrack(stream.getVideoTracks()[0] || screenTrack);
        stream.addTrack(originalVideoTrackRef.current);
        setLocalStream(stream);
        setIsScreenSharing(false);
        originalVideoTrackRef.current = null;
      }
    } catch (error) {
      console.error('Error stopping screen share:', error);
    }
  }, []); // No deps needed – uses refs only

  /**
   * Toggle screen sharing
   */
  const toggleScreenShare = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream || !peerConnectionRef.current) return;

    try {
      if (isScreenSharing) {
        // Stop screen sharing, restore camera
        await stopScreenShare();
      } else {
        // Check if screen sharing is supported (not available on mobile)
        if (!navigator.mediaDevices?.getDisplayMedia) {
          throw new Error('Screen sharing is not supported on this device.');
        }

        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });

        const screenTrack = screenStream.getVideoTracks()[0];
        const currentVideoTrack = stream.getVideoTracks()[0];

        // Save original video track
        originalVideoTrackRef.current = currentVideoTrack;

        // Replace video track with screen track
        const sender = peerConnectionRef.current
          .getSenders()
          .find((s) => s.track?.kind === 'video');

        if (sender) {
          await sender.replaceTrack(screenTrack);
          stream.removeTrack(currentVideoTrack);
          stream.addTrack(screenTrack);
          setLocalStream(stream);
          setIsScreenSharing(true);

          // Handle when user stops sharing via browser UI
          screenTrack.onended = () => {
            stopScreenShare();
          };
        } else {
          // No video sender (shouldn't happen in video calls)
          screenTrack.stop();
          throw new Error('No video track to replace for screen sharing.');
        }
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      // Re-throw so the UI can show a user-friendly message
      if (error instanceof Error) {
        // Don't throw for user-cancelled screen share picker
        if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
          console.log('Screen share was cancelled by user');
          return;
        }
        throw error;
      }
    }
  }, [isScreenSharing, stopScreenShare]);

  /**
   * End call and cleanup.
   * Only cleans up WebRTC resources – does NOT invoke onCallEnded.
   * Callers (VideoCallModal) are responsible for updating Firestore and closing the UI.
   */
  const endCall = useCallback(() => {
    console.log('useVideoCall - endCall() called');
    // Stop all tracks via ref so we always get the latest stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Stop the saved camera track if screen sharing was active
    if (originalVideoTrackRef.current) {
      originalVideoTrackRef.current.stop();
      originalVideoTrackRef.current = null;
    }

    // Close peer connection – this triggers 'closed' state which we intentionally ignore
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);
    setIsAudioEnabled(true);
    setIsVideoEnabled(true);
    setIsScreenSharing(false);
  }, []); // Empty deps – uses refs only, never stale

  // Cleanup on unmount only (not when endCall changes)
  useEffect(() => {
    const signals = processedSignalsRef.current;
    const candidates = iceCandidateQueueRef.current;
    return () => {
      console.log('useVideoCall - Cleaning up on unmount');
      // Stop all tracks using ref to get current value
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }

      // Stop saved camera track from screen sharing
      if (originalVideoTrackRef.current) {
        originalVideoTrackRef.current.stop();
        originalVideoTrackRef.current = null;
      }

      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      // Clear processed signals and ICE candidate queue
      signals.clear();
      candidates.length = 0;
    };
  }, []); // Empty deps - only run on unmount

  return {
    localStream,
    remoteStream,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    isScreenSharingSupported,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    startCall,
    endCall,
  };
};
