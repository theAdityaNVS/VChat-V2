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

    // Build the document, omitting undefined fields (Firestore rejects them)
    const doc: Record<string, unknown> = {
      callId: data.callId,
      roomId: data.roomId,
      callerId: data.callerId,
      callerName: data.callerName,
      calleeId: data.calleeId,
      calleeName: data.calleeName,
      mediaType: data.mediaType,
      outcome: data.outcome,
      timestamp: Timestamp.fromDate(data.timestamp),
      createdAt: Timestamp.now(),
    };

    if (data.callerAvatar != null) doc.callerAvatar = data.callerAvatar;
    if (data.calleeAvatar != null) doc.calleeAvatar = data.calleeAvatar;
    if (data.duration != null) doc.duration = data.duration;

    await addDoc(callLogsRef, doc);

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

  // Use Maps to properly track logs from each subscription
  const callerLogs = new Map<string, CallLog>();
  const calleeLogs = new Map<string, CallLog>();

  const emitMergedLogs = () => {
    const merged = new Map<string, CallLog>();
    callerLogs.forEach((log, id) => merged.set(id, log));
    calleeLogs.forEach((log, id) => merged.set(id, log));

    const sorted = Array.from(merged.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
    callback(sorted);
  };

  const parseLog = (
    doc: { id: string; data: () => Record<string, unknown> },
    userId: string
  ): CallLog => {
    const data = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      callId: data.callId as string,
      roomId: data.roomId as string,
      callerId: data.callerId as string,
      callerName: data.callerName as string,
      callerAvatar: data.callerAvatar as string | undefined,
      calleeId: data.calleeId as string,
      calleeName: data.calleeName as string,
      calleeAvatar: data.calleeAvatar as string | undefined,
      mediaType: data.mediaType as MediaType,
      direction: (data.callerId as string) === userId ? 'outgoing' : 'incoming',
      outcome: data.outcome as CallOutcome,
      duration: data.duration as number | undefined,
      timestamp: (data.timestamp as { toDate: () => Date })?.toDate() || new Date(),
      createdAt: (data.createdAt as { toDate: () => Date })?.toDate() || new Date(),
    };
  };

  const unsubscribe1 = onSnapshot(
    q,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          callerLogs.set(change.doc.id, parseLog(change.doc, userId));
        } else if (change.type === 'removed') {
          callerLogs.delete(change.doc.id);
        }
      });
      emitMergedLogs();
    },
    (error) => {
      console.error('Error in user call logs subscription (caller):', error);
      callback([]);
    }
  );

  const unsubscribe2 = onSnapshot(
    q2,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          calleeLogs.set(change.doc.id, parseLog(change.doc, userId));
        } else if (change.type === 'removed') {
          calleeLogs.delete(change.doc.id);
        }
      });
      emitMergedLogs();
    },
    (error) => {
      console.error('Error in user call logs subscription (callee):', error);
    }
  );

  return () => {
    unsubscribe1();
    unsubscribe2();
  };
};

/**
 * Subscribe to call logs for a specific room
 * Only fetches logs where the user is either caller or callee (to respect security rules)
 */
export const subscribeToRoomCallLogs = (
  roomId: string,
  callback: (logs: CallLog[]) => void,
  userId: string,
  limitCount: number = 20
): (() => void) => {
  const callLogsRef = collection(db, 'callLogs');

  // Query for logs where user is caller
  const q1 = query(
    callLogsRef,
    where('roomId', '==', roomId),
    where('callerId', '==', userId),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );

  // Query for logs where user is callee
  const q2 = query(
    callLogsRef,
    where('roomId', '==', roomId),
    where('calleeId', '==', userId),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );

  // Use Maps to properly track logs from each subscription
  const callerLogs = new Map<string, CallLog>();
  const calleeLogs = new Map<string, CallLog>();

  const emitMergedLogs = () => {
    const merged = new Map<string, CallLog>();
    callerLogs.forEach((log, id) => merged.set(id, log));
    calleeLogs.forEach((log, id) => merged.set(id, log));

    const sorted = Array.from(merged.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
    callback(sorted);
  };

  const parseLog = (
    doc: { id: string; data: () => Record<string, unknown> },
    direction: 'outgoing' | 'incoming'
  ): CallLog => {
    const data = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      callId: data.callId as string,
      roomId: data.roomId as string,
      callerId: data.callerId as string,
      callerName: data.callerName as string,
      callerAvatar: data.callerAvatar as string | undefined,
      calleeId: data.calleeId as string,
      calleeName: data.calleeName as string,
      calleeAvatar: data.calleeAvatar as string | undefined,
      mediaType: data.mediaType as MediaType,
      direction,
      outcome: data.outcome as CallOutcome,
      duration: data.duration as number | undefined,
      timestamp: (data.timestamp as { toDate: () => Date })?.toDate() || new Date(),
      createdAt: (data.createdAt as { toDate: () => Date })?.toDate() || new Date(),
    };
  };

  const unsubscribe1 = onSnapshot(
    q1,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          callerLogs.set(change.doc.id, parseLog(change.doc, 'outgoing'));
        } else if (change.type === 'removed') {
          callerLogs.delete(change.doc.id);
        }
      });
      emitMergedLogs();
    },
    (error) => {
      console.error('Error in room call logs subscription (caller):', error);
    }
  );

  const unsubscribe2 = onSnapshot(
    q2,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          calleeLogs.set(change.doc.id, parseLog(change.doc, 'incoming'));
        } else if (change.type === 'removed') {
          calleeLogs.delete(change.doc.id);
        }
      });
      emitMergedLogs();
    },
    (error) => {
      console.error('Error in room call logs subscription (callee):', error);
    }
  );

  return () => {
    unsubscribe1();
    unsubscribe2();
  };
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
