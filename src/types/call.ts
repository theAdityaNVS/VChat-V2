export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended' | 'rejected';

export type CallType = '1-on-1' | 'group';

export type MediaType = 'audio' | 'video';

export interface Call {
  id: string;
  roomId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  calleeId: string;
  calleeName: string;
  calleeAvatar?: string;
  type: CallType;
  mediaType: MediaType;
  status: CallStatus;
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
}

export interface CallOffer {
  sdp: string;
  type: 'offer';
}

export interface CallAnswer {
  sdp: string;
  type: 'answer';
}

export interface IceCandidate {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
}

export interface CallSignal {
  callId: string;
  senderId: string;
  receiverId: string;
  type: 'offer' | 'answer' | 'ice-candidate';
  offer?: CallOffer;
  answer?: CallAnswer;
  iceCandidate?: IceCandidate;
  createdAt: Date;
}

export interface CreateCallData {
  roomId: string;
  calleeId: string;
  calleeName: string;
  calleeAvatar?: string;
  mediaType?: MediaType; // 'audio' or 'video', defaults to 'video'
}

export type CallDirection = 'incoming' | 'outgoing';
export type CallOutcome = 'completed' | 'missed' | 'rejected' | 'no-answer' | 'cancelled';

export interface CallLog {
  id: string;
  callId: string;
  roomId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  calleeId: string;
  calleeName: string;
  calleeAvatar?: string;
  mediaType: MediaType;
  direction: CallDirection; // For the current user
  outcome: CallOutcome;
  duration?: number; // In seconds
  timestamp: Date;
  createdAt: Date;
}
