export type BetslipResult = "pending" | "won" | "lost";

export type Betslip = {
  company: string;
  title: string;
  cost: number;
  currency: string;
  imageUrl: string;
  expiresAt: number;
  result: BetslipResult;
  settledAt?: number | null;
  createdAt: number;
  createdBy: string;
};

export type Purchase = {
  status: "completed" | "pending" | "failed";
  paidAt?: number;
  amount?: number;
  orderId?: string;
  reference?: string;
  betslipId?: string;
};

export type UserPayment = {
  betslipId: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: number;
  updatedAt?: number;
  orderId?: string;
  reference?: string;
  selcomTransid?: string;
  palmpesaTransid?: string;
};

export type SupportTicket = {
  uid: string;
  email: string;
  subject: string;
  message: string;
  status: "open" | "closed";
  createdAt: number;
};

export type AppNotification = {
  id?: string;
  title: string;
  message: string;
  imageUrl?: string;
  createdAt: number;
};

export type MovieGroup = {
  id?: string;
  name: string;
  thumbnail: string;
  amount: number;
  currency: string;
  description: string;
  createdAt: number;
};

export type Movie = {
  id?: string;
  groupId: string;
  title: string;
  youtubeId?: string;
  videoUrl?: string;
  duration?: string;
  createdAt: number;
};
