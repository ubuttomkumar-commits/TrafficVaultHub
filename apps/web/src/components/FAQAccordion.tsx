import { useState } from "react";
import styles from "./FAQAccordion.module.css";

const FAQS = [
  {
    q: "What is the minimum payout threshold and payment schedule?",
    a: "The minimum payout threshold is $50 (5,000 minor units). Supported rails include Binance Pay (USDT/crypto) and wire transfers. Funds move to PAYABLE status once conversions are approved and hold periods clear.",
  },
  {
    q: "How does TrafficVaultHub prevent duplicate postback fraud?",
    a: "Every S2S postback is evaluated against a deterministic compound idempotency key (organizationId + externalConversionId). Replayed or duplicate postbacks are acknowledged without generating redundant ledger credits.",
  },
  {
    q: "How are campaign caps enforced across edge nodes?",
    a: "Caps are enforced in real-time via Cloudflare Durable Objects (OfferCapDO) with atomic in-memory mutexes and automatic atomic D1 database fallbacks. Once a daily or total cap is reached, traffic is safely paused or routed via Smartlinks.",
  },
  {
    q: "Can publishers dispute a rejected conversion?",
    a: "Yes. The platform provides a formal Disputes & Appeals workflow where affiliates can provide transaction evidence, server timestamps, or order receipts for manual compliance review.",
  },
];

export function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className={styles.faqContainer}>
      {FAQS.map((faq, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i} className={`${styles.faqItem} ${isOpen ? styles.faqItemOpen : ""}`}>
            <button
              type="button"
              className={styles.faqQuestionBtn}
              onClick={() => toggle(i)}
              aria-expanded={isOpen}
            >
              <span>{faq.q}</span>
              <span className={styles.toggleIcon}>{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen && (
              <div className={styles.faqAnswer}>
                {faq.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
