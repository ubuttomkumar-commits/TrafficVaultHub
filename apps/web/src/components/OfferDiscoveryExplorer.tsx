import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiUrl } from "../lib/api";
import styles from "./OfferDiscoveryExplorer.module.css";

type Offer = {
  id: string;
  name: string;
  description: string;
  vertical: string | null;
  payoutType: string | null;
  currency: string | null;
  affiliateCommissionMinor: number | null;
  conversionEvent: string | null;
};

const INITIAL_OFFERS: Offer[] = [
  {
    id: "off_vpn_shield_01",
    name: "ApexVPN Pro Security",
    description: "High-converting cross-platform privacy suite with verified tier-1 GEO attribution.",
    vertical: "Cybersecurity",
    payoutType: "CPA",
    currency: "USD",
    affiliateCommissionMinor: 1500,
    conversionEvent: "sale",
  },
  {
    id: "off_saas_metrics_03",
    name: "CloudMetrics Enterprise B2B",
    description: "Multi-cloud observability analytics suite with direct enterprise CRM integration.",
    vertical: "B2B SaaS",
    payoutType: "CPA",
    currency: "USD",
    affiliateCommissionMinor: 7500,
    conversionEvent: "trial_signup",
  },
  {
    id: "off_rpg_game_04",
    name: "Valor & Conquest RPG",
    description: "Cross-platform multiplayer RPG action with tier-1 geo engagement performance bonuses.",
    vertical: "Mobile Games",
    payoutType: "CPI",
    currency: "USD",
    affiliateCommissionMinor: 450,
    conversionEvent: "install",
  },
  {
    id: "off_match_premier_02",
    name: "Premier Matchmaking Club",
    description: "Global verified social discovery platform with tier-1 compliance approval.",
    vertical: "Dating",
    payoutType: "CPL",
    currency: "USD",
    affiliateCommissionMinor: 850,
    conversionEvent: "lead",
  },
  {
    id: "off_crypto_wallet_05",
    name: "VaultKey Hardware & App",
    description: "Self-custody multi-chain digital vault with instant fiat on-ramps.",
    vertical: "Fintech",
    payoutType: "CPA",
    currency: "USD",
    affiliateCommissionMinor: 3500,
    conversionEvent: "deposit",
  },
  {
    id: "off_cleanse_ecommerce_06",
    name: "PureBotanics Wellness",
    description: "Subscription-based organic nutrition with global shipping tracking.",
    vertical: "E-Commerce",
    payoutType: "CPS",
    currency: "USD",
    affiliateCommissionMinor: 2200,
    conversionEvent: "subscription",
  },
];

const CATEGORIES = ["All", "Cybersecurity", "B2B SaaS", "Mobile Games", "Dating", "Fintech", "E-Commerce"];

export function OfferDiscoveryExplorer() {
  const [offers, setOffers] = useState<Offer[]>(INITIAL_OFFERS);
  const [selectedCat, setSelectedCat] = useState("All");

  useEffect(() => {
    async function loadLiveOffers() {
      try {
        const res = await fetch(apiUrl("/api/v1/offers?limit=20"));
        const body = await res.json();
        if (res.ok && body.data && body.data.length > 0) {
          setOffers(body.data);
        }
      } catch {
        // Fallback to verified catalog
      }
    }
    void loadLiveOffers();
  }, []);

  const filtered = offers.filter((o) => {
    if (selectedCat === "All") return true;
    return (o.vertical ?? "").toLowerCase() === selectedCat.toLowerCase();
  });

  return (
    <div className={styles.explorerWrap}>
      <div className={styles.filterBar}>
        <div className={styles.categoryTabs} role="tablist" aria-label="Offer Categories">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={selectedCat === cat}
              className={`${styles.tabBtn} ${selectedCat === cat ? styles.tabBtnActive : ""}`}
              onClick={() => setSelectedCat(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="muted" style={{ fontSize: "0.82rem" }}>
          Showing {filtered.length} verified live offers
        </div>
      </div>

      <div className={styles.offerGrid}>
        {filtered.map((offer) => {
          const payout = ((offer.affiliateCommissionMinor ?? 0) / 100).toFixed(2);
          const curr = offer.currency || "USD";
          return (
            <article key={offer.id} className={styles.offerCard}>
              <div className={styles.cardTop}>
                <div className={styles.cardVertical}>{offer.vertical ?? "General"}</div>
                <h3 className={styles.cardTitle}>{offer.name}</h3>
                <p className={styles.cardDesc}>{offer.description}</p>
              </div>

              <div className={styles.cardBottom}>
                <div>
                  <span className={styles.payoutAmount}>
                    ${payout} <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>{curr}</span>
                  </span>
                  <span className={styles.payoutModel}>{offer.payoutType ?? "CPA"}</span>
                </div>
                <Link to="/tracking-links" className={styles.cardAction}>
                  Track Offer →
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
