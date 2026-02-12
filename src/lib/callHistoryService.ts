import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  limit,
  getDocs,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { CallLog, MediaType, CallOutcome } from '../types/call';

/**
 * Create a call log entry
 */
export const createCallLog = async (data: {
  callId: string;
  roomId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  calleeId: string;
  calleeName: string;
  calleeAvatar?: string;
  mediaType: MediaType;
  outcome: CallOutcome;
  duration?: number;
  timestamp: Date;
}): Promise<void> => {
  try {
    const callLogsRef = collection(db, 'callLogs');

    await addDoc(callLogsRef, {
      ...data,
      timestamp: Timestamp.fromDate(data.timestamp),
      createdAt: Timestamp.now(),
    });

    console.log('Call log created successfully');
  } catch (error) {
    console.error('Error creating call log:', error);
    throw error;
  }
};

/**
 * Subscribe to call logs for a specific user
 */
export const subscribeToUserCallLogs = (
  userId: string,
  callback: (logs: CallLog[]) => void,
  limitCount: number = 50
): (() => void) => {
  const callLogsRef = collection(db, 'callLogs');

  // Get logs where user is either caller or callee
  const q = query(
    callLogsRef,
    where('callerId', '==', userId),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );

  const q2 = query(
    callLogsRef,
    where('calleeId', '==', userId),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );

  const logs: CallLog[] = [];
  const processedIds = new Set<string>();

  const unsubscribe1 = onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const data = change.doc.data();
      const log: CallLog = {
        id: change.doc.id,
        callId: data.callId,
        roomId: data.roomId,
        callerId: data.callerId,
        callerName: data.callerName,
        callerAvatar: data.callerAvatar,
        calleeId: data.calleeId,
        calleeName: data.calleeName,
        calleeAvatar: data.calleeAvatar,
        mediaType: data.mediaType,
        direction: data.callerId === userId ? 'outgoing' : 'incoming',
        outcome: data.outcome,
        duration: data.duration,
        timestamp: data.timestamp?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
      };

      if (change.type === 'added' && !processedIds.has(log.id)) {
        logs.push(log);
        processedIds.add(log.id);
      }
    });

    // Sort by timestamp and callback
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    callback([...logs]);
  });

  const unsubscribe2 = onSnapshot(q2, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const data = change.doc.data();
      const log: CallLog = {
        id: change.doc.id,
        callId: data.callId,
        roomId: data.roomId,
        callerId: data.callerId,
        callerName: data.callerName,
        callerAvatar: data.callerAvatar,
        calleeId: data.calleeId,
        calleeName: data.calleeName,
        calleeAvatar: data.calleeAvatar,
        mediaType: data.mediaType,
        direction: data.callerId === userId ? 'outgoing' : 'incoming',
        outcome: data.outcome,
        duration: data.duration,
        timestamp: data.timestamp?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
      };

      if (change.type === 'added' && !processedIds.has(log.id)) {
        logs.push(log);
        processedIds.add(log.id);
      }
    });

    // Sort by timestamp and callback
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    callback([...logs]);
  });

  return () => {
    unsubscribe1();
    unsubscribe2();
  };
};

/**
 * Subscribe to call logs for a specific room
 */
export const subscribeToRoomCallLogs = (
  roomId: string,
  callback: (logs: CallLog[]) => void,
  userId: string,
  limitCount: number = 20
): (() => void) => {
  const callLogsRef = collection(db, 'callLogs');
  const q = query(
    callLogsRef,
    where('roomId', '==', roomId),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const logs: CallLog[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      logs.push({
        id: doc.id,
        callId: data.callId,
        roomId: data.roomId,
        callerId: data.callerId,
        callerName: data.callerName,
        callerAvatar: data.callerAvatar,
        calleeId: data.calleeId,
        calleeName: data.calleeName,
        calleeAvatar: data.calleeAvatar,
        mediaType: data.mediaType,
        direction: data.callerId === userId ? 'outgoing' : 'incoming',
        outcome: data.outcome,
        duration: data.duration,
        timestamp: data.timestamp?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
      });
    });

    callback(logs);
  });

  return unsubscribe;
};

/**
 * Get call logs count for a user
 */
export const getUserCallLogsCount = async (userId: string): Promise<number> => {
  try {
    const callLogsRef = collection(db, 'callLogs');

    const q1 = query(callLogsRef, where('callerId', '==', userId));
    const q2 = query(callLogsRef, where('calleeId', '==', userId));

    const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);

    // Combine and deduplicate
    const ids = new Set<string>();
    snapshot1.forEach((doc) => ids.add(doc.id));
    snapshot2.forEach((doc) => ids.add(doc.id));

    return ids.size;
  } catch (error) {
    console.error('Error getting call logs count:', error);
    return 0;
  }
};
