import type { SVGProps } from "react";

// One stroked 24px icon set, drawn inline so the PWA has no icon-font or
// network dependency. Stroke 1.7 matches the hairline weight of the UI.
const PATHS: Record<string, string> = {
  dashboard: "M3 11.5 12 4l9 7.5M5.5 9.8V20h13V9.8M10 20v-5.5h4V20",
  units: "M3 20h18M5 20V6.5A1.5 1.5 0 0 1 6.5 5h6A1.5 1.5 0 0 1 14 6.5V20M14 11h3.5A1.5 1.5 0 0 1 19 12.5V20M8 9h3M8 13h3M8 17h3M16.5 15h1",
  calendar: "M4.5 6.5h15v13h-15zM4.5 10.5h15M8.5 4v4M15.5 4v4M8 14h2M14 14h2",
  bookings: "M6 3.5h12v17l-6-3.5-6 3.5zM9 8h6M9 11.5h4",
  income: "M3.5 7.5h17v11h-17zM3.5 11h17M7 15h3M20.5 9.5V6.5a1 1 0 0 0-1.2-1L4.7 8",
  inbox: "M20.5 11.5c0 4.1-3.8 7.5-8.5 7.5-1.1 0-2.2-.2-3.2-.5L3.5 20l1.4-3.6C4 15 3.5 13.3 3.5 11.5 3.5 7.4 7.3 4 12 4s8.5 3.4 8.5 7.5Z",
  pricing: "M12.6 3.5H20v7.4l-8.8 8.8a1.5 1.5 0 0 1-2.1 0l-5.3-5.3a1.5 1.5 0 0 1 0-2.1zM16.4 7.6h.01",
  settings: "M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a1.9 1.9 0 1 1-2.7 2.7l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a1.9 1.9 0 1 1-3.8 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a1.9 1.9 0 1 1-2.7-2.7l.1-.1A1.6 1.6 0 0 0 3.6 15h-.2a1.9 1.9 0 1 1 0-3.8h.2A1.6 1.6 0 0 0 4.7 8.4l-.1-.1a1.9 1.9 0 1 1 2.7-2.7l.1.1a1.6 1.6 0 0 0 2.8-1.1v-.2a1.9 1.9 0 1 1 3.8 0v.2a1.6 1.6 0 0 0 2.7 1.1l.1-.1a1.9 1.9 0 1 1 2.7 2.7l-.1.1a1.6 1.6 0 0 0 1.1 2.8h.2a1.9 1.9 0 1 1 0 3.8h-.2a1.6 1.6 0 0 0-1.1.9Z",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-3.9-3.9",
  x: "M6 6l12 12M18 6 6 18",
  check: "M4.5 12.5 9.5 17.5 19.5 7",
  chevronLeft: "M14.5 5 8 12l6.5 7",
  chevronRight: "M9.5 5 16 12l-6.5 7",
  chevronDown: "M5 9.5 12 16l7-6.5",
  chevronUp: "M5 14.5 12 8l7 6.5",
  arrowRight: "M4 12h15M13 6l6 6-6 6",
  arrowUp: "M12 19V5M6 11l6-6 6 6",
  arrowDown: "M12 5v14M6 13l6 6 6-6",
  clock: "M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17ZM12 7.5V12l3 2",
  users: "M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-4A3.5 3.5 0 0 0 5 17.5V19M10.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.5 19v-1.4a3.5 3.5 0 0 0-2.6-3.4M15.5 4.2a3.5 3.5 0 0 1 0 6.6",
  pin: "M12 21s7-5.3 7-11a7 7 0 1 0-14 0c0 5.7 7 11 7 11ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  camera: "M4 8.5h3l1.5-2.5h7L17 8.5h3v10H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
  trash: "M4.5 6.5h15M9.5 6.5V4.5h5v2M6.5 6.5 7.5 20h9l1-13.5M10 10v6M14 10v6",
  edit: "M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3ZM14.5 6.5l3 3",
  star: "M12 4l2.5 5.2 5.5.8-4 3.9 1 5.6-5-2.7-5 2.7 1-5.6-4-3.9 5.5-.8z",
  send: "M4.5 12 20 4.5 14 20l-3.2-6.3z M10.8 13.7 20 4.5",
  phone: "M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a1.5 1.5 0 0 1-1.7 1.5C10.7 17.8 6.2 13.3 5 6.2A1.5 1.5 0 0 1 6.5 4Z",
  whatsapp:
    "M12 3.5a8.4 8.4 0 0 0-7.2 12.7L3.5 20.5l4.4-1.2A8.4 8.4 0 1 0 12 3.5Z M9 8.6c.3-.1.6 0 .8.3l.7 1.2c.1.3.1.6-.1.8l-.5.5a5.6 5.6 0 0 0 2.7 2.7l.5-.5c.2-.2.5-.3.8-.1l1.2.7c.3.2.4.5.3.8-.3.8-1.2 1.3-2 1.1a8.3 8.3 0 0 1-5.5-5.5c-.2-.8.3-1.7 1.1-2Z",
  filter: "M4 6.5h16M7 12h10M10 17.5h4",
  download: "M12 4v10M8 10.5l4 4 4-4M4.5 18.5h15",
  wallet: "M4 7.5A1.5 1.5 0 0 1 5.5 6h11A1.5 1.5 0 0 1 18 7.5v.5h1.5A1.5 1.5 0 0 1 21 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 4 17.5zM16.5 13.5h.01",
  bolt: "M13 3 5.5 13.5H11L10.5 21 18.5 10H13z",
  home: "M3 11.5 12 4l9 7.5M5.5 9.8V20h13V9.8",
  bed: "M4 19v-9M4 13.5h16V19M4 19h16M7.5 10.5h3M13 10.5h5a2 2 0 0 1 2 2v1M8.5 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
  bath: "M4 12.5h16v2a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM6.5 12.5V6.2A1.7 1.7 0 0 1 9.8 5.6M7 19.5 6 21M17 19.5 18 21",
  wifi: "M2.5 9a15 15 0 0 1 19 0M5.5 12.5a10.5 10.5 0 0 1 13 0M8.5 16a6 6 0 0 1 7 0M12 19.5h.01",
  more: "M6 12h.01M12 12h.01M18 12h.01",
  bell: "M18 9a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9ZM10.3 19a2 2 0 0 0 3.4 0",
  share: "M12 15V4M8.5 7.5 12 4l3.5 3.5M5.5 12.5v6.5h13v-6.5",
  external: "M14 4h6v6M20 4l-8.5 8.5M18 14v5.5H4.5V6H10",
  copy: "M8.5 8.5h10v11h-10zM15.5 8.5V4.5h-10v11h3",
  sparkle: "M12 3.5 13.6 8.4 18.5 10 13.6 11.6 12 16.5 10.4 11.6 5.5 10 10.4 8.4zM18.5 16.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z",
  refresh: "M20 12a8 8 0 1 1-2.6-5.9M20 4.5V10h-5.5",
  install: "M12 3.5v11M8 11l4 4 4-4M5 20h14",
};

export type IconName = keyof typeof PATHS;

interface Props extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: string;
  size?: number;
  filled?: boolean;
}

export function Icon({ name, size = 20, filled = false, ...rest }: Props) {
  const d = PATHS[name] ?? PATHS.more;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <path d={d} />
    </svg>
  );
}

export default Icon;
