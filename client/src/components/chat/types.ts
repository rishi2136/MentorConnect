export type ChatContact = {
  sessionId: string;
  name: string;
  role: string;
  initials: string;
  tone: string;
  topic: string;
  status: string;
  lastActivity?: string;
};

export type ChatMessage = {
  id: string;
  sessionId: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: string;
};
