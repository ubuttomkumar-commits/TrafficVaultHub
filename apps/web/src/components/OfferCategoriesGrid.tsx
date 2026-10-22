import { Link } from "react-router-dom";
import styles from "./OfferCategoriesGrid.module.css";

const CATEGORIES = [
  {
    id: "dating",
    name: "Dating & Relationships",
    gradient: "linear-gradient(135deg, #db2777 0%, #be185d 100%)",
    glow: "rgba(219, 39, 119, 0.4)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
    ),
  },
  {
    id: "apps",
    name: "Mobile Apps & Software",
    gradient: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
    glow: "rgba(2, 132, 199, 0.4)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
    ),
  },
  {
    id: "gaming",
    name: "Gaming & Entertainment",
    gradient: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
    glow: "rgba(124, 58, 237, 0.4)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="6" y1="12" x2="10" y2="12" />
        <line x1="8" y1="10" x2="8" y2="14" />
        <line x1="15" y1="13" x2="15.01" y2="13" />
        <line x1="18" y1="11" x2="18.01" y2="11" />
        <rect x="2" y="6" width="20" height="12" rx="2" />
      </svg>
    ),
  },
  {
    id: "ecommerce",
    name: "E-commerce & Retail",
    gradient: "linear-gradient(135deg, #059669 0%, #047857 100%)",
    glow: "rgba(5, 150, 105, 0.4)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    ),
  },
  {
    id: "finance",
    name: "Finance & Business",
    gradient: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
    glow: "rgba(217, 119, 6, 0.4)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
        <path d="M12 6v2m0 8v2" />
      </svg>
    ),
  },
  {
    id: "education",
    name: "Education & Employment",
    gradient: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    glow: "rgba(37, 99, 235, 0.4)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
  },
  {
    id: "travel",
    name: "Travel & Hospitality",
    gradient: "linear-gradient(135deg, #db2777 0%, #9d174d 100%)",
    glow: "rgba(219, 39, 119, 0.4)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
      </svg>
    ),
  },
  {
    id: "health",
    name: "Health & Wellness",
    gradient: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
    glow: "rgba(13, 148, 136, 0.4)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    id: "home",
    name: "Home & Local Services",
    gradient: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
    glow: "rgba(99, 102, 241, 0.4)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: "media",
    name: "Media & Content",
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
    glow: "rgba(139, 92, 246, 0.4)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
  },
  {
    id: "surveys",
    name: "Surveys & Rewards",
    gradient: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)",
    glow: "rgba(234, 88, 12, 0.4)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 12 20 22 4 22 4 12" />
        <rect x="2" y="7" width="20" height="5" />
        <line x1="12" y1="22" x2="12" y2="7" />
        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
      </svg>
    ),
  },
  {
    id: "other",
    name: "Other",
    gradient: "linear-gradient(135deg, #334155 0%, #1e293b 100%)",
    glow: "rgba(51, 65, 85, 0.4)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
        <circle cx="5" cy="12" r="1" />
      </svg>
    ),
  },
];

export function OfferCategoriesGrid() {
  return (
    <div className={styles.grid}>
      {CATEGORIES.map((cat) => (
        <Link
          key={cat.id}
          to={`/offers?vertical=${encodeURIComponent(cat.name)}`}
          className={styles.tile}
        >
          <div
            className={styles.iconBox}
            style={{
              background: cat.gradient,
              boxShadow: `0 0 18px ${cat.glow}`,
              color: "#ffffff",
            }}
          >
            {cat.icon}
          </div>
          <span className={styles.name}>{cat.name}</span>
        </Link>
      ))}
    </div>
  );
}
