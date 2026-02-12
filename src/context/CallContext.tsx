import { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  createCall as createCallService,
  subscribeToIncomingCalls,
  subscribeToCall,
  acceptCall as acceptCallService,
  rejectCall as rejectCallService,
  endCall as endCallService,
} from '../lib/callService';
import { createCallLog } from '../lib/callHistoryService';
import type { Call, CreateCallData, CallOutcome } from '../types/call';

interface CallContextType {
  currentCall: Call | null;
  incomingCalls: Call[];
  isInCall: boolean;
  initiateCall: (data: CreateCallData) => Promise<string>;
  acceptCall: (callId: string) => Promise<void>;
  rejectCall: (callId: string) => Promise<void>;
  endCall: () => Promise<void>;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

interface CallProviderProps {
  children: ReactNode;
}

export function CallProvider({ children }: CallProviderProps) {
  const { currentUser, userDoc } = useAuth();
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [incomingCalls, setIncomingCalls] = useState<Call[]>([]);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const dismissedCallIdsRef = useRef<Set<string>>(new Set());
  const callStatusUnsubscribesRef = useRef<Map<string, () => void>>(new Map());
  const loggedCallIdsRef = useRef<Set<string>>(new Set());

  // Subscribe to incoming calls
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribes: (() => void)[] = [];

    const unsubscribe = subscribeToIncomingCalls(currentUser.uid, (calls) => {
      console.log('Incoming calls update:', calls.length, calls);

      setIncomingCalls((prevCalls) => {
        // Start with existing calls that haven't been dismissed
        const existingCallsMap = new Map(prevCalls.map((c) => [c.id, c]));

        // Add or update calls from Firestore (only if not dismissed)
        calls.forEach((call) => {
          if (!dismissedCallIdsRef.current.has(call.id)) {
            existingCallsMap.set(call.id, call);

            // Subscribe to status changes for this incoming call
            if (!callStatusUnsubscribesRef.current.has(call.id)) {
              const statusUnsub = subscribeToCall(call.id, (updatedCall) => {
                if (
                  updatedCall &&
                  (updatedCall.status === 'ended' || updatedCall.status === 'rejected')
                ) {
                  // Skip if this call is being handled by active call subscription or already logged
                  if (activeCallId === call.id || loggedCallIdsRef.current.has(call.id)) {
                    return;
                  }

                  // Call was cancelled by caller or rejected/missed
                  if (!dismissedCallIdsRef.current.has(call.id)) {
                    dismissedCallIdsRef.current.add(call.id);
                    loggedCallIdsRef.current.add(call.id);

                    // Create call log based on scenario
                    let outcome: CallOutcome;
                    if (updatedCall.status === 'rejected') {
                      // Could be auto-timeout or caller cancelled
                      outcome = 'missed';
                    } else {
                      outcome = 'cancelled';
                    }

                    createCallLog({
                      callId: call.id,
                      roomId: call.roomId,
                      callerId: call.callerId,
                      callerName: call.callerName,
                      callerAvatar: call.callerAvatar,
                      calleeId: call.calleeId,
                      calleeName: call.calleeName,
                      calleeAvatar: call.calleeAvatar,
                      mediaType: call.mediaType,
                      outcome,
                      timestamp: new Date(),
                    }).catch((error) => {
                      console.error(
                        'Error creating call log for cancelled/missed incoming call:',
                        error
                      );
                    });

                    // Remove from incoming calls
                    setIncomingCalls((prev) => prev.filter((c) => c.id !== call.id));
                  }

                  // Cleanup subscription
                  const unsub = callStatusUnsubscribesRef.current.get(call.id);
                  if (unsub) {
                    unsub();
                    callStatusUnsubscribesRef.current.delete(call.id);
                  }
                }
              });
              callStatusUnsubscribesRef.current.set(call.id, statusUnsub);
            }
          }
        });

        // Remove calls that are too old (>60 seconds) or explicitly dismissed
        const now = Date.now();
        const updatedCalls = Array.from(existingCallsMap.values()).filter((call) => {
          const callAge = now - call.createdAt.getTime();

          if (callAge > 60000 && !dismissedCallIdsRef.current.has(call.id)) {
            console.log('Auto-dismissing stale call:', call.id, 'age:', callAge);
            dismissedCallIdsRef.current.add(call.id);

            // Create missed call log only if not already logged
            if (!loggedCallIdsRef.current.has(call.id)) {
              loggedCallIdsRef.current.add(call.id);
              createCallLog({
                callId: call.id,
                roomId: call.roomId,
                callerId: call.callerId,
                callerName: call.callerName,
                callerAvatar: call.callerAvatar,
                calleeId: call.calleeId,
                calleeName: call.calleeName,
                calleeAvatar: call.calleeAvatar,
                mediaType: call.mediaType,
                outcome: 'missed',
                timestamp: new Date(),
              }).catch((error) => {
                console.error('Error creating missed call log:', error);
              });
            }

            return false;
          }

          if (dismissedCallIdsRef.current.has(call.id)) {
            return false;
          }

          return true;
        });

        console.log('Updated calls state:', updatedCalls.length, updatedCalls);
        return updatedCalls;
      });
    });

    unsubscribes.push(unsubscribe);

    return () => {
      unsubscribes.forEach((unsub) => unsub());
      callStatusUnsubscribesRef.current.forEach((unsub) => unsub());
      callStatusUnsubscribesRef.current.clear();
    };
  }, [currentUser]);

  // Subscribe to active call updates
  useEffect(() => {
    if (!activeCallId) {
      console.log('CallContext - No active call ID');
      return;
    }

    console.log('CallContext - Subscribing to active call:', activeCallId);

    const unsubscribe = subscribeToCall(activeCallId, async (call) => {
      console.log('CallContext - Active call update:', call?.status, call);
      if (call) {
        setCurrentCall(call);

        // If call ended, create call log and cleanup
        if (call.status === 'ended' || call.status === 'rejected') {
          console.log('CallContext - Call ended/rejected, creating call log');

          // Create call log only if not already logged
          if (!loggedCallIdsRef.current.has(call.id)) {
            loggedCallIdsRef.current.add(call.id);
            try {
              let outcome: CallOutcome;
              let duration: number | undefined;

              if (call.status === 'rejected') {
                outcome = 'rejected';
              } else if (call.startedAt && call.endedAt) {
                outcome = 'completed';
                // Calculate duration in seconds
                const start =
                  call.startedAt instanceof Date ? call.startedAt : call.startedAt.toDate();
                const end = call.endedAt instanceof Date ? call.endedAt : call.endedAt.toDate();
                duration = Math.floor((end.getTime() - start.getTime()) / 1000);
              } else {
                // Call was ended without being answered
                outcome = currentUser?.uid === call.callerId ? 'cancelled' : 'no-answer';
              }

              await createCallLog({
                callId: call.id,
                roomId: call.roomId,
                callerId: call.callerId,
                callerName: call.callerName,
                callerAvatar: call.callerAvatar,
                calleeId: call.calleeId,
                calleeName: call.calleeName,
                calleeAvatar: call.calleeAvatar,
                mediaType: call.mediaType,
                outcome,
                duration,
                timestamp: call.endedAt || new Date(),
              });
              console.log('CallContext - Call log created successfully');
            } catch (error) {
              console.error('CallContext - Error creating call log:', error);
            }
          }

          // Cleanup
          setTimeout(() => {
            setCurrentCall(null);
            setActiveCallId(null);
          }, 1000);
        }
      } else {
        console.log('CallContext - Call document deleted');
        setCurrentCall(null);
        setActiveCallId(null);
      }
    });

    return () => {
      console.log('CallContext - Unsubscribing from active call:', activeCallId);
      unsubscribe();
    };
  }, [activeCallId, currentUser?.uid]);

  const initiateCall = async (data: CreateCallData): Promise<string> => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      // Use userDoc if available, otherwise fall back to currentUser
      const displayName = userDoc?.displayName || currentUser.displayName || 'Anonymous';
      const photoURL = userDoc?.photoURL || currentUser.photoURL || undefined;

      console.log('Initiating call to:', data.calleeId, data.calleeName);
      const callId = await createCallService(currentUser.uid, displayName, data, photoURL);
      console.log('Call created with ID:', callId);

      setActiveCallId(callId);
      return callId;
    } catch (error) {
      console.error('Error initiating call:', error);
      throw error;
    }
  };

  const acceptCall = async (callId: string): Promise<void> => {
    try {
      console.log('CallContext - Accepting call:', callId);
      await acceptCallService(callId);
      setActiveCallId(callId);
      console.log('CallContext - Set active call ID:', callId);

      // Mark as dismissed to remove from incoming calls
      dismissedCallIdsRef.current.add(callId);
      setIncomingCalls((prev) => prev.filter((call) => call.id !== callId));

      // Cleanup status subscription since active call subscription will handle it
      const statusUnsub = callStatusUnsubscribesRef.current.get(callId);
      if (statusUnsub) {
        statusUnsub();
        callStatusUnsubscribesRef.current.delete(callId);
      }
      console.log('CallContext - Removed from incoming calls');
    } catch (error) {
      console.error('Error accepting call:', error);
      // Remove the call from incoming calls even if acceptance failed
      dismissedCallIdsRef.current.add(callId);
      setIncomingCalls((prev) => prev.filter((call) => call.id !== callId));
      throw error;
    }
  };

  const rejectCall = async (callId: string): Promise<void> => {
    try {
      // Find the call details before rejecting
      const call = incomingCalls.find((c) => c.id === callId);

      // Mark as dismissed and logged to prevent duplicates
      dismissedCallIdsRef.current.add(callId);

      await rejectCallService(callId);

      // Create call log for rejected incoming call
      if (call && !loggedCallIdsRef.current.has(callId)) {
        loggedCallIdsRef.current.add(callId);
        try {
          await createCallLog({
            callId: call.id,
            roomId: call.roomId,
            callerId: call.callerId,
            callerName: call.callerName,
            callerAvatar: call.callerAvatar,
            calleeId: call.calleeId,
            calleeName: call.calleeName,
            calleeAvatar: call.calleeAvatar,
            mediaType: call.mediaType,
            outcome: 'rejected',
            timestamp: new Date(),
          });
          console.log('Call log created for rejected call');
        } catch (error) {
          console.error('Error creating call log for rejected call:', error);
        }
      }

      // Remove from incoming calls
      setIncomingCalls((prev) => prev.filter((call) => call.id !== callId));
    } catch (error) {
      console.error('Error rejecting call:', error);
      throw error;
    }
  };

  const endCall = async (): Promise<void> => {
    if (!activeCallId) return;

    try {
      console.log('Ending call:', activeCallId);
      await endCallService(activeCallId);
      setCurrentCall(null);
      setActiveCallId(null);
    } catch (error) {
      console.error('Error ending call:', error);
      throw error;
    }
  };

  const value: CallContextType = {
    currentCall,
    incomingCalls,
    isInCall: currentCall?.status === 'connected',
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCall() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within CallProvider');
  }
  return context;
}
