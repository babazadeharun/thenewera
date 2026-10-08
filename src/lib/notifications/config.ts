import { Bell, CalendarClock, CircleDollarSign, Mail, Megaphone, ReceiptText, type LucideIcon } from 'lucide-react';
import type { NotificationPriority, NotificationType } from '@prisma/client';

export const NOTIFICATION_CONFIG: Record<NotificationType, { icon: LucideIcon; label: string; color: string; tone: string }> = {
  INVOICE_OVERDUE: { icon: ReceiptText, label: 'Invoice overdue', color: '#ff6673', tone: 'danger' },
  FOLLOW_UP_DUE: { icon: CalendarClock, label: 'Follow-up bu gün', color: '#f3c84b', tone: 'warning' },
  NEW_EMAIL: { icon: Mail, label: 'Yeni email', color: '#4dc9ff', tone: 'info' },
  PAYMENT_RECEIVED: { icon: CircleDollarSign, label: 'Payment received', color: '#54d98c', tone: 'success' },
  PROMOTER_APPLICATION: { icon: Megaphone, label: 'Yeni promoter application', color: '#c27cff', tone: 'purple' },
  PROJECT_DEADLINE: { icon: CalendarClock, label: 'Project deadline', color: '#ffb45b', tone: 'deadline' },
  SYSTEM: { icon: Bell, label: 'Sistem', color: '#b9c5c8', tone: 'system' },
};

export const PRIORITY_LABEL: Record<NotificationPriority, string> = {
  LOW: 'Aşağı', NORMAL: 'Normal', HIGH: 'Yüksək', URGENT: 'Təcili',
};
