import { createContext, useContext, useState, useEffect } from 'react';
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
import type { Call, CreateCallData } from '../types/call';

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

  // Subscribe to incoming calls
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToIncomingCalls(currentUser.uid, (calls) => {
      setIncomingCalls(calls);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Subscribe to active call updates
  useEffect(() => {
    if (!activeCallId) return;

    const unsubscribe = subscribeToCall(activeCallId, (call) => {
      if (call) {
        setCurrentCall(call);

        // If call ended, cleanup
        if (call.status === 'ended' || call.status === 'rejected') {
          setTimeout(() => {
            setCurrentCall(null);
            setActiveCallId(null);
          }, 1000);
        }
      } else {
        setCurrentCall(null);
        setActiveCallId(null);
      }
    });

    return () => unsubscribe();
  }, [activeCallId]);

  const initiateCall = async (data: CreateCallData): Promise<string> => {
    if (!currentUser || !userDoc) {
      throw new Error('User not authenticated');
    }

    try {
      const callId = await createCallService(
        currentUser.uid,
        userDoc.displayName,
        data,
        userDoc.photoURL
      );

      setActiveCallId(callId);
      return callId;
    } catch (error) {
      console.error('Error initiating call:', error);
      throw error;
    }
  };

  const acceptCall = async (callId: string): Promise<void> => {
    try {
      await acceptCallService(callId);
      setActiveCallId(callId);

      // Remove from incoming calls
      setIncomingCalls((prev) => prev.filter((call) => call.id !== callId));
    } catch (error) {
      console.error('Error accepting call:', error);
      throw error;
    }
  };

  const rejectCall = async (callId: string): Promise<void> => {
    try {
      await rejectCallService(callId);

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
