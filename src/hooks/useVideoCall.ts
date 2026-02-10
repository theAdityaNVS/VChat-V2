import { useEffect, useRef, useState, useCallback } from 'react';
import { subscribeToSignals, sendOffer, sendAnswer, sendIceCandidate } from '../lib/callService';
import type { CallSignal } from '../types/call';

// STUN servers for NAT traversal
const ICE_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }],
};

interface UseVideoCallProps {
  callId: string | null;
  userId: string;
  isInitiator: boolean;
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
  onRemoteStream,
  onCallEnded,
}: UseVideoCallProps): UseVideoCallReturn => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);

  // Get remote user ID from call
  const remoteUserId = useRef<string>('');

  /**
   * Initialize local media stream
   */
  const initLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw new Error('Failed to access camera/microphone');
    }
  }, []);

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

    try {
      const stream = await initLocalStream();
      const peerConnection = await initPeerConnection(stream);

      if (!peerConnection) return;

      // Create and send offer
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      await peerConnection.setLocalDescription(offer);

      if (remoteUserId.current) {
        await sendOffer(callId, userId, remoteUserId.current, {
          sdp: offer.sdp || '',
          type: 'offer',
        });
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

    const unsubscribe = subscribeToSignals(callId, userId, async (signal: CallSignal) => {
      try {
        // Set remote user ID
        remoteUserId.current = signal.senderId;

        // Initialize peer connection if not already done
        if (!peerConnectionRef.current) {
          const stream = await initLocalStream();
          await initPeerConnection(stream);
        }

        const peerConnection = peerConnectionRef.current;
        if (!peerConnection) return;

        if (signal.type === 'offer' && signal.offer) {
          // Handle incoming offer
          await peerConnection.setRemoteDescription(
            new RTCSessionDescription({
              type: 'offer',
              sdp: signal.offer.sdp,
            })
          );

          // Create and send answer
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);

          await sendAnswer(callId, userId, signal.senderId, {
            sdp: answer.sdp || '',
            type: 'answer',
          });
        } else if (signal.type === 'answer' && signal.answer) {
          // Handle incoming answer
          await peerConnection.setRemoteDescription(
            new RTCSessionDescription({
              type: 'answer',
              sdp: signal.answer.sdp,
            })
          );
        } else if (signal.type === 'ice-candidate' && signal.iceCandidate) {
          // Handle incoming ICE candidate
          await peerConnection.addIceCandidate(
            new RTCIceCandidate({
              candidate: signal.iceCandidate.candidate,
              sdpMid: signal.iceCandidate.sdpMid,
              sdpMLineIndex: signal.iceCandidate.sdpMLineIndex,
            })
          );
        }
      } catch (error) {
        console.error('Error handling signal:', error);
      }
    });

    return () => unsubscribe();
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
      onCallEnded();
    }
  }, [localStream, onCallEnded]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

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
