export type UnitStatus = "active" | "maintenance" | "inactive";

export interface Unit {
  id: number;
  name: string;
  code: string | null;
  type: string;
  building: string;
  address: string;
  floor: string;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  description: string;
  base_rate: number;
  min_hours: number;
  cleaning_fee: number;
  extra_guest_fee: number;
  status: UnitStatus;
  created_at: string;
}

export interface UnitPhoto {
  id: number;
  unit_id: number;
  url: string;
  caption: string;
  sort_order: number;
  is_cover: boolean;
}

export interface UnitWithPhotos extends Unit {
  photos: UnitPhoto[];
}

export type BookingStatus =
  | "inquiry"
  | "confirmed"
  | "checked_in"
  | "completed"
  | "cancelled"
  | "no_show";

export type BookingSource = "whatsapp" | "walk_in" | "phone" | "instagram" | "repeat";

export interface Booking {
  id: number;
  code: string;
  unit_id: number;
  guest_name: string;
  guest_phone: string;
  guests: number;
  starts_at: string;
  ends_at: string;
  hours: number;
  base_amount: number;
  fees_amount: number;
  discount_amount: number;
  total_amount: number;
  breakdown: { label: string; amount: number }[];
  status: BookingStatus;
  source: BookingSource;
  notes: string;
  created_at: string;
}

export interface BookingWithUnit extends Booking {
  unit_name: string;
  unit_code: string | null;
  cover_url: string | null;
  paid_amount: number;
}

export type PaymentMethod = "cash" | "transfer" | "qris" | "ewallet" | "card";

export interface Payment {
  id: number;
  booking_id: number;
  amount: number;
  method: PaymentMethod;
  paid_at: string;
  note: string;
}

export type ExpenseCategory =
  | "cleaning"
  | "utilities"
  | "supplies"
  | "maintenance"
  | "rent"
  | "marketing"
  | "other";

export interface Expense {
  id: number;
  unit_id: number | null;
  category: ExpenseCategory;
  amount: number;
  incurred_on: string;
  note: string;
  unit_name?: string | null;
}

export type RuleKind = "day_of_week" | "time_of_day" | "date_range" | "duration" | "fee";

export interface PricingRule {
  id: number;
  unit_id: number | null;
  name: string;
  kind: RuleKind;
  params: Record<string, unknown>;
  priority: number;
  active: boolean;
  unit_name?: string | null;
}

export interface WaContact {
  id: number;
  phone: string;
  name: string;
  avatar_hue: number;
  last_message_at: string;
  unread: number;
  labels: string[];
  preview?: string;
}

export interface WaMessage {
  id: number;
  contact_id: number;
  direction: "in" | "out";
  body: string;
  media_url: string | null;
  status: "pending" | "sent" | "delivered" | "read" | "failed";
  created_at: string;
}

export const BOOKING_STATUSES: BookingStatus[] = [
  "inquiry",
  "confirmed",
  "checked_in",
  "completed",
  "cancelled",
  "no_show",
];

export const BOOKING_SOURCES: BookingSource[] = [
  "whatsapp",
  "walk_in",
  "phone",
  "instagram",
  "repeat",
];

export const PAYMENT_METHODS: PaymentMethod[] = ["cash", "transfer", "qris", "ewallet", "card"];

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "cleaning",
  "utilities",
  "supplies",
  "maintenance",
  "rent",
  "marketing",
  "other",
];

export const AMENITY_OPTIONS = [
  "Wi-Fi",
  "Air conditioning",
  "Smart TV",
  "Netflix",
  "Kitchenette",
  "Full kitchen",
  "Hot water",
  "Washing machine",
  "Workspace",
  "Balcony",
  "Garden view",
  "Pool access",
  "Gym access",
  "Parking",
  "Elevator",
  "Security 24h",
];
