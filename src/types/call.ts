export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended' | 'rejected';

export type CallType = '1-on-1' | 'group';

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
}
