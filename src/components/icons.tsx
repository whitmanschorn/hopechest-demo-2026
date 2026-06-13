import type { ComponentProps } from "react";

type IconProps = ComponentProps<"svg">;

function base(props: IconProps): IconProps {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    ...props,
  };
}

export function ChestIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 10c0-2.2 1.8-4 4-4h8c2.2 0 4 1.8 4 4v8H4v-8Z" />
      <path d="M4 12h16" />
      <path d="M11 12h2v3h-2z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m4 10.5 8-6.5 8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.5Z" />
    </svg>
  );
}

export function AlbumsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="7" width="14" height="13" rx="1.5" />
      <path d="M7.5 7V5.5A1.5 1.5 0 0 1 9 4h9.5A1.5 1.5 0 0 1 20 5.5V16a1.5 1.5 0 0 1-1.5 1.5H18" />
      <path d="m4 16 4-4 4 4 2.5-2.5L18 17" />
    </svg>
  );
}

export function AskIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 4 13.6 8.9 18.5 10.5 13.6 12.1 12 17 10.4 12.1 5.5 10.5 10.4 8.9 12 4Z" />
      <path d="M18.5 15.5 19.2 17.4 21 18 19.2 18.7 18.5 20.5 17.8 18.7 16 18 17.8 17.4 18.5 15.5Z" />
    </svg>
  );
}

export function PeopleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19.5c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8" />
      <circle cx="16.8" cy="9.5" r="2.5" />
      <path d="M16.5 14.7c2.2.2 3.7 1.7 4.2 4" />
    </svg>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 16V5" />
      <path d="m7.5 9.5 4.5-4.5 4.5 4.5" />
      <path d="M5 19h14" />
    </svg>
  );
}

export function DocumentIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 3.5h7L19 8.5V19a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 19V5a1.5 1.5 0 0 1 1-1.5Z" />
      <path d="M14 3.5V9h5" />
      <path d="M9.5 13h5M9.5 16.5h5" />
    </svg>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="6" width="16" height="13" rx="1.5" />
      <path d="m4.5 7.5 7.5 6 7.5-6" />
    </svg>
  );
}

export function FamilyIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="6.5" r="2.5" />
      <circle cx="5.5" cy="9" r="2" />
      <circle cx="18.5" cy="9" r="2" />
      <path d="M8.5 20c.4-3 1.8-4.8 3.5-4.8s3.1 1.8 3.5 4.8" />
      <path d="M2.5 17.5c.3-2.3 1.4-3.7 3-3.7.6 0 1.2.2 1.7.7" />
      <path d="M21.5 17.5c-.3-2.3-1.4-3.7-3-3.7-.6 0-1.2.2-1.7.7" />
    </svg>
  );
}

export function SparkleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 5 13.3 9.2 17.5 10.5 13.3 11.8 12 16 10.7 11.8 6.5 10.5 10.7 9.2 12 5Z" />
    </svg>
  );
}

export function CopiesIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="8" y="8" width="12" height="12" rx="1.5" />
      <path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" />
    </svg>
  );
}

export function RestoreIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 12a8 8 0 1 1 2.3 5.7" />
      <path d="M4 13v4.5M4 17.5h4.5" stroke="none" />
      <path d="M4 12.5V17h4.5" />
      <path d="m9.5 13.5 2 2 4-4.5" />
    </svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m14.5 5.5-6 6.5 6 6.5" />
    </svg>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m4.5 11 15-6.5-4 15-4.2-5.8L4.5 11Z" />
      <path d="m11.3 13.7 8.2-9.2" />
    </svg>
  );
}

export function CameraIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2L9 5h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9Z" />
      <circle cx="12" cy="12.8" r="3.2" />
    </svg>
  );
}

export function MapPinIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 21s6.5-5.4 6.5-10.5a6.5 6.5 0 0 0-13 0C5.5 15.6 12 21 12 21Z" />
      <circle cx="12" cy="10.5" r="2.4" />
    </svg>
  );
}

export function CommentIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 5.5h14A1.5 1.5 0 0 1 20.5 7v8A1.5 1.5 0 0 1 19 16.5H9l-4 3.5V7A1.5 1.5 0 0 1 6.5 5.5Z" />
      <path d="M8.5 10h7M8.5 13h4" />
    </svg>
  );
}

export function ReplyIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 8 5 12l4 4" />
      <path d="M5 12h8.5a5.5 5.5 0 0 1 5.5 5.5V18" />
    </svg>
  );
}

export function SmileIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9 13.5a3.5 3.5 0 0 0 6 0" />
      <path d="M9 9.5h.01M15 9.5h.01" />
    </svg>
  );
}
