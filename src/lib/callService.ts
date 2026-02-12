import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  getDocs,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
  Call,
  CreateCallData,
  CallSignal,
  CallOffer,
  CallAnswer,
  IceCandidate,
} from '../types/call';

/**
 * Create a new call
 */
export const createCall = async (
  callerId: string,
  callerName: string,
  data: CreateCallData,
  callerAvatar?: string
): Promise<string> => {
  try {
    const callsRef = collection(db, 'calls');
    const newCall = {
      roomId: data.roomId,
      callerId,
      callerName,
      callerAvatar: callerAvatar || null,
      calleeId: data.calleeId,
      calleeName: data.calleeName,
      calleeAvatar: data.calleeAvatar || null,
      type: '1-on-1',
      mediaType: data.mediaType || 'video',
      status: 'ringing',
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(callsRef, newCall);

    // Auto-cancel call after 60 seconds if not answered
    setTimeout(async () => {
      try {
        const callDoc = await getDoc(doc(db, 'calls', docRef.id));
        if (callDoc.exists() && callDoc.data().status === 'ringing') {
          await updateCallStatus(docRef.id, 'rejected');
        }
      } catch (error) {
        console.debug('Call timeout cleanup failed:', error);
      }
    }, 60000);

    return docRef.id;
  } catch (error) {
    console.error('Error creating call:', error);
    throw new Error('Failed to create call');
  }
};

/**
 * Update call status
 */
export const updateCallStatus = async (callId: string, status: Call['status']): Promise<void> => {
  try {
    const callRef = doc(db, 'calls', callId);
    const updates: Record<string, unknown> = { status };

    if (status === 'connected') {
      updates.startedAt = serverTimestamp();
    } else if (status === 'ended' || status === 'rejected') {
      updates.endedAt = serverTimestamp();
    }

    await updateDoc(callRef, updates);
  } catch (error) {
    console.error('Error updating call status:', error);
    throw new Error('Failed to update call status');
  }
};

/**
 * Subscribe to a specific call
 */
export const subscribeToCall = (
  callId: string,
  callback: (call: Call | null) => void
): (() => void) => {
  const callRef = doc(db, 'calls', callId);

  const unsubscribe = onSnapshot(
    callRef,
    (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        callback({
          id: docSnapshot.id,
          roomId: data.roomId,
          callerId: data.callerId,
          callerName: data.callerName,
          callerAvatar: data.callerAvatar,
          calleeId: data.calleeId,
          calleeName: data.calleeName,
          calleeAvatar: data.calleeAvatar,
          type: data.type,
          mediaType: data.mediaType || 'video',
          status: data.status,
          startedAt: data.startedAt?.toDate(),
          endedAt: data.endedAt?.toDate(),
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error('Error subscribing to call:', error);
    }
  );

  return unsubscribe;
};

/**
 * Subscribe to incoming calls for a user
 */
export const subscribeToIncomingCalls = (
  userId: string,
  callback: (calls: Call[]) => void
): (() => void) => {
  const callsRef = collection(db, 'calls');
  const q = query(callsRef, where('calleeId', '==', userId), where('status', '==', 'ringing'));

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const calls: Call[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        calls.push({
          id: doc.id,
          roomId: data.roomId,
          callerId: data.callerId,
          callerName: data.callerName,
          callerAvatar: data.callerAvatar,
          calleeId: data.calleeId,
          calleeName: data.calleeName,
          calleeAvatar: data.calleeAvatar,
          type: data.type,
          mediaType: data.mediaType || 'video',
          status: data.status,
          startedAt: data.startedAt?.toDate(),
          endedAt: data.endedAt?.toDate(),
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });
      console.log(
        'subscribeToIncomingCalls - Firestore update:',
        calls.length,
        'calls with status=ringing'
      );
      callback(calls);
    },
    (error) => {
      console.error('Error subscribing to incoming calls:', error);
    }
  );

  return unsubscribe;
};

/**
 * Send WebRTC offer
 */
export const sendOffer = async (
  callId: string,
  senderId: string,
  receiverId: string,
  offer: CallOffer
): Promise<void> => {
  try {
    const signalsRef = collection(db, 'calls', callId, 'signals');
    await addDoc(signalsRef, {
      callId,
      senderId,
      receiverId,
      type: 'offer',
      offer,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error sending offer:', error);
    throw new Error('Failed to send offer');
  }
};

/**
 * Send WebRTC answer
 */
export const sendAnswer = async (
  callId: string,
  senderId: string,
  receiverId: string,
  answer: CallAnswer
): Promise<void> => {
  try {
    const signalsRef = collection(db, 'calls', callId, 'signals');
    await addDoc(signalsRef, {
      callId,
      senderId,
      receiverId,
      type: 'answer',
      answer,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error sending answer:', error);
    throw new Error('Failed to send answer');
  }
};

/**
 * Send ICE candidate
 */
export const sendIceCandidate = async (
  callId: string,
  senderId: string,
  receiverId: string,
  iceCandidate: IceCandidate
): Promise<void> => {
  try {
    const signalsRef = collection(db, 'calls', callId, 'signals');
    await addDoc(signalsRef, {
      callId,
      senderId,
      receiverId,
      type: 'ice-candidate',
      iceCandidate,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error sending ICE candidate:', error);
    // Don't throw here, ICE candidates are not critical
  }
};

/**
 * Subscribe to call signals (offers, answers, ICE candidates)
 */
export const subscribeToSignals = (
  callId: string,
  userId: string,
  callback: (signal: CallSignal & { id: string }) => void
): (() => void) => {
  const signalsRef = collection(db, 'calls', callId, 'signals');
  const q = query(signalsRef, where('receiverId', '==', userId));

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      querySnapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          callback({
            id: change.doc.id, // Include document ID for deduplication
            callId: data.callId,
            senderId: data.senderId,
            receiverId: data.receiverId,
            type: data.type,
            offer: data.offer,
            answer: data.answer,
            iceCandidate: data.iceCandidate,
            createdAt: data.createdAt?.toDate() || new Date(),
          });
        }
      });
    },
    (error) => {
      console.error('Error subscribing to signals:', error);
    }
  );

  return unsubscribe;
};

/**
 * End a call and cleanup
 */
export const endCall = async (callId: string): Promise<void> => {
  try {
    // Update call status
    await updateCallStatus(callId, 'ended');

    // Optional: Clean up signals after a delay
    setTimeout(async () => {
      try {
        // Check if call document still exists before cleaning up
        const callRef = doc(db, 'calls', callId);
        const callSnap = await getDoc(callRef);

        if (callSnap.exists()) {
          const signalsRef = collection(db, 'calls', callId, 'signals');
          const signalsSnapshot = await getDocs(signalsRef);

          if (!signalsSnapshot.empty) {
            const deletePromises = signalsSnapshot.docs.map((doc) => deleteDoc(doc.ref));
            await Promise.all(deletePromises);
          }
        }
      } catch (error) {
        // Silently ignore cleanup errors as they're non-critical
        console.debug(
          'Signal cleanup skipped:',
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }, 5000);
  } catch (error) {
    console.error('Error ending call:', error);
    throw new Error('Failed to end call');
  }
};

/**
 * Accept an incoming call
 */
export const acceptCall = async (callId: string): Promise<void> => {
  try {
    console.log('acceptCall - Checking if call still exists:', callId);
    // First check if the call still exists and is in ringing status
    const callRef = doc(db, 'calls', callId);
    const callSnap = await getDoc(callRef);

    if (!callSnap.exists()) {
      console.log('acceptCall - Call no longer exists:', callId);
      throw new Error('Call has ended');
    }

    const callData = callSnap.data();
    if (callData.status !== 'ringing') {
      console.log('acceptCall - Call status is not ringing:', callData.status);
      throw new Error(`Call is ${callData.status}`);
    }

    console.log('acceptCall - Updating call status to connected:', callId);
    await updateCallStatus(callId, 'connected');
  } catch (error) {
    console.error('Error accepting call:', error);
    throw error;
  }
};

/**
 * Reject an incoming call
 */
export const rejectCall = async (callId: string): Promise<void> => {
  try {
    console.log('rejectCall - Updating call status to rejected:', callId);
    await updateCallStatus(callId, 'rejected');
  } catch (error) {
    console.error('Error rejecting call:', error);
    throw new Error('Failed to reject call');
  }
};
