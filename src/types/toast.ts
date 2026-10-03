export type ToastType = 'take_profit' | 'stop_loss' | 'buy_dip' | 'bot_status' | 'info' | 'warning' | 'error';

export interface ToastNotification {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  symbol?: string;
  price?: number;
  pnlUsdt?: number;
  pnlPercent?: number;
  quantity?: number;
  timestamp: number;
  durationMs?: number;
}
