import { useState } from "react";
import { Link } from "react-router-dom";
import { apiUrl } from "../../lib/api";
import { EmailOtpVerification } from "../auth/EmailOtpVerification";
import styles from "./OnboardingStyles.module.css";

const TRAFFIC_SOURCE_OPTIONS = [
  "SEO / Content sites",
  "Paid Search (Google/Bing)",
  "Facebook / Meta Ads",
  "TikTok Ads",
  "Native (Taboola/Outbrain)",
  "Push Notifications",
  "Pop / Direct Navigation",
  "Email Marketing",
  "YouTube / Video Ads",
  "Mobile App Traffic",
  "Offerwalls",
  "Influencer / Social Organic",
  "Other Direct Media",
];

const VERTICAL_OPTIONS = [
  "Dating & Relationships",
  "Mobile Applications & Software",
  "Gaming & Entertainment",
  "E-commerce & Retail",
  "Finance & Business",
  "Health, Wellness & Lifestyle",
  "B2B SaaS",
  "VPN & Cybersecurity",
  "Adult Dating (Restricted)",
];

const FREE_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "aol.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
];

export function PublisherWizard() {
  const [step, setStep] = useState(1);

  // Step 1: Basic Info
  const [subType, setSubType] = useState<"INDIVIDUAL" | "COMPANY" | "AGENCY">("INDIVIDUAL");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [contactMethod, setContactMethod] = useState("TELEGRAM");
  const [contactHandle, setContactHandle] = useState("");
  const [timezone, setTimezone] = useState("UTC-5 (Eastern)");

  // Step 2: Location & Identity
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("United States");
  const [dob, setDob] = useState("");
  const [idType, setIdType] = useState("PASSPORT");
  const [idFrontName, setIdFrontName] = useState<string | null>(null);
  const [idBackName, setIdBackName] = useState<string | null>(null);
  const [selfieName, setSelfieName] = useState<string | null>(null);

  // Step 3: Traffic & Experience (Anti-scam)
  const [experienceLevel, setExperienceLevel] = useState("INTERMEDIATE");
  const [yearsExperience, setYearsExperience] = useState(3);
  const [previousNetworks, setPreviousNetworks] = useState("");
  const [selectedSources, setSelectedSources] = useState<string[]>(["Paid Search (Google/Bing)"]);
  const [trafficDescription, setTrafficDescription] = useState("");
  const [monthlyVolume, setMonthlyVolume] = useState("25,000–50,000 clicks/mo");
  const [selectedVerticals, setSelectedVerticals] = useState<string[]>(["VPN & Cybersecurity"]);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [incentivizedTraffic, setIncentivizedTraffic] = useState(false);
  const [incentiveDetails, setIncentiveDetails] = useState("");
  const [restrictedIntent, setRestrictedIntent] = useState(false);
  const [prohibitedMethodsAccepted, setProhibitedMethodsAccepted] = useState(false);

  // Step 4: Terms
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [antiFraudAccepted, setAntiFraudAccepted] = useState(false);
  const [penaltyAccepted, setPenaltyAccepted] = useState(false);

  // State & Feedback
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<any | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  // Live checks
  const emailDomain = email.toLowerCase().split("@")[1] ?? "";
  const isFreeEmail = FREE_EMAIL_DOMAINS.includes(emailDomain);

  function toggleSource(s: string) {
    if (selectedSources.includes(s)) {
      setSelectedSources(selectedSources.filter((x) => x !== s));
    } else {
      setSelectedSources([...selectedSources, s]);
    }
  }

  function toggleVertical(v: string) {
    if (selectedVerticals.includes(v)) {
      setSelectedVerticals(selectedVerticals.filter((x) => x !== v));
    } else {
      setSelectedVerticals([...selectedVerticals, v]);
    }
    if (v.includes("Adult") || v.includes("Restricted")) {
      setRestrictedIntent(true);
    }
  }

  function validateStep(s: number): boolean {
    setError(null);
    if (s === 1) {
      if (!firstName.trim() || !lastName.trim()) {
        setError("Legal first and last name are mandatory (must match your government photo ID)");
        return false;
      }
      if (!email.trim() || !email.includes("@")) {
        setError("Valid email address required");
        return false;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters");
        return false;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return false;
      }
      if (!phone.trim()) {
        setError("Direct phone number with country code is required for KYC compliance");
        return false;
      }
      if (!contactHandle.trim()) {
        setError(`Please enter your ${contactMethod} username/number for interview scheduling`);
        return false;
      }
    } else if (s === 2) {
      if (!addressLine1.trim() || !city.trim() || !postalCode.trim() || !country.trim()) {
        setError("Full physical residential address is mandatory for fraud prevention");
        return false;
      }
      if (!dob) {
        setError("Date of birth is required to verify legal majority (18+)");
        return false;
      }
      const birthYear = new Date(dob).getFullYear();
      const currentYear = new Date().getFullYear();
      if (currentYear - birthYear < 18) {
        setError("Publishers must be at least 18 years old to join TrafficVaultHub");
        return false;
      }
      if (!idFrontName) {
        setError("Government photo ID front upload is mandatory for identity verification");
        return false;
      }
    } else if (s === 3) {
      if (selectedSources.length === 0) {
        setError("Select at least one primary traffic source");
        return false;
      }
      if (trafficDescription.trim().length < 50) {
        setError("Please provide a detailed description of your traffic acquisition strategy (minimum 50 characters). Vague answers are rejected.");
        return false;
      }
      if (incentivizedTraffic && !incentiveDetails.trim()) {
        setError("Please explain your incentivized traffic mechanics and offerwall disclosures");
        return false;
      }
      if (!prohibitedMethodsAccepted) {
        setError("You must confirm you will never run unapproved, bot, or deceptive traffic");
        return false;
      }
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!termsAccepted || !antiFraudAccepted || !penaltyAccepted) {
      setError("You must accept all required regulatory and anti-fraud terms");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(apiUrl("/api/v1/onboarding/publisher"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountType: "PUBLISHER",
          subType,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          companyName: companyName.trim() || undefined,
          email: email.trim().toLowerCase(),
          password,
          phone: phone.trim(),
          contactMethod,
          contactHandle: contactHandle.trim(),
          timezone,
          addressLine1: addressLine1.trim(),
          city: city.trim(),
          stateProvince: stateProvince.trim() || undefined,
          postalCode: postalCode.trim(),
          country: country.trim(),
          dob,
          experienceLevel,
          trafficExperienceYears: yearsExperience,
          previousNetworks: previousNetworks.trim() || undefined,
          trafficSources: selectedSources,
          trafficDescription: trafficDescription.trim(),
          estimatedMonthlyVolume: monthlyVolume,
          targetVerticals: selectedVerticals,
          websiteUrl: websiteUrl.trim() || undefined,
          incentivizedTraffic,
          incentiveDetails: incentiveDetails.trim() || undefined,
          restrictedCategoriesIntent: restrictedIntent,
          termsAccepted,
          antiFraudAccepted,
          penaltyAcknowledgmentAccepted: penaltyAccepted,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error?.message ?? `Submission failed (HTTP ${res.status})`);
      }

      setSubmittedData(body.data);

      // Upload simulated documents
      if (body.data?.applicationId) {
        if (idFrontName) {
          await fetch(apiUrl("/api/v1/onboarding/documents"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              applicationId: body.data.applicationId,
              docType: "GOV_ID_FRONT",
              fileName: idFrontName,
              fileSizeBytes: 240000,
              mimeType: "image/jpeg",
            }),
          });
        }
        if (idBackName) {
          await fetch(apiUrl("/api/v1/onboarding/documents"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              applicationId: body.data.applicationId,
              docType: "GOV_ID_BACK",
              fileName: idBackName,
              fileSizeBytes: 220000,
              mimeType: "image/jpeg",
            }),
          });
        }
        if (selfieName) {
          await fetch(apiUrl("/api/v1/onboarding/documents"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              applicationId: body.data.applicationId,
              docType: "SELFIE_WITH_ID",
              fileName: selfieName,
              fileSizeBytes: 310000,
              mimeType: "image/jpeg",
            }),
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Application submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyEmailSim() {
    if (!submittedData?.applicationId) return;
    try {
      const res = await fetch(apiUrl("/api/v1/onboarding/verify-email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: submittedData.applicationId, code: "849201" }),
      });
      if (res.ok) setEmailVerified(true);
    } catch {
      // ignore
    }
  }

  async function handleVerifyPhoneSim() {
    if (!submittedData?.applicationId) return;
    try {
      const res = await fetch(apiUrl("/api/v1/onboarding/verify-phone"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: submittedData.applicationId, code: "591024" }),
      });
      if (res.ok) setPhoneVerified(true);
    } catch {
      // ignore
    }
  }

  // ---------------------------------------------------------------------------
  // SUCCESS / EMAIL OTP & PENDING REVIEW STATE
  // ---------------------------------------------------------------------------
  if (submittedData && !emailVerified) {
    return (
      <div className={styles.wizardContainer}>
        <EmailOtpVerification
          email={email}
          applicationId={submittedData.applicationId}
          onVerified={() => setEmailVerified(true)}
          subtitle={
            <>
              An automated 6-digit verification code has been dispatched to{" "}
              <strong style={{ color: "var(--color-accent-cyan)" }}>{email}</strong>.
              Enter it below to confirm your contact authenticity and unlock your compliance docket.
            </>
          }
        />
      </div>
    );
  }

  if (submittedData) {
    return (
      <div className={styles.wizardContainer}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🛡️</div>
          <h2 style={{ fontSize: "1.6rem", margin: "0 0 0.5rem", color: "var(--color-text-primary)" }}>
            Application Under Compliance Review
          </h2>
          <div style={{ display: "inline-block", background: "rgba(34, 211, 238, 0.1)", border: "1px solid var(--color-accent-cyan)", padding: "0.3rem 0.8rem", borderRadius: "9999px", fontSize: "0.85rem", color: "var(--color-accent-cyan)" }}>
            Application ID: <span className="mono">{submittedData.applicationId}</span>
          </div>
        </div>

        <div className={styles.warningBox}>
          <div>⚠️</div>
          <div>
            <strong>Manual Verification Required (MaxBounty-Grade Review)</strong>
            <div style={{ marginTop: "0.25rem", color: "rgba(253, 230, 138, 0.9)" }}>
              Self-declared data never creates automated trust on TrafficVaultHub. Every publisher is individually vetted. Most applications are resolved within 1–3 business days. We may contact you at <strong>{phone}</strong> ({contactMethod}: {contactHandle}) for a brief audio/video interview.
            </div>
          </div>
        </div>

        {/* Verification Checklist */}
        <div style={{ background: "var(--color-bg-base)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "1.25rem", marginBottom: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", color: "var(--color-text-primary)" }}>
            Initial Verification Verification Gates
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>1. Primary Email Address</strong>
                <div className={styles.helpText}>{email}</div>
              </div>
              {emailVerified ? (
                <span style={{ color: "var(--color-success)", fontWeight: 600 }}>✓ Verified</span>
              ) : (
                <button type="button" className={styles.btnSecondary} onClick={() => void handleVerifyEmailSim()} style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
                  Confirm Email Code
                </button>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--color-border)", paddingTop: "0.75rem" }}>
              <div>
                <strong>2. Telephone / SMS Gateway</strong>
                <div className={styles.helpText}>{phone}</div>
              </div>
              {phoneVerified ? (
                <span style={{ color: "var(--color-success)", fontWeight: 600 }}>✓ Verified</span>
              ) : (
                <button type="button" className={styles.btnSecondary} onClick={() => void handleVerifyPhoneSim()} style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
                  Confirm Phone OTP
                </button>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--color-border)", paddingTop: "0.75rem" }}>
              <div>
                <strong>3. Government Photo ID Document</strong>
                <div className={styles.helpText}>{idFrontName ?? "Document registered in encrypted vault"}</div>
              </div>
              <span style={{ color: "var(--color-warning)", fontWeight: 600 }}>⏳ Under Compliance Inspection</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
          <Link to={`/verification?applicationId=${submittedData.applicationId}`} className={styles.btnPrimary}>
            Open Multi-Dimensional Trust Cockpit →
          </Link>
          <Link to="/offers" className={styles.btnSecondary}>
            Explore Public Offers
          </Link>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // MULTI-STEP WIZARD FORM
  // ---------------------------------------------------------------------------
  return (
    <div className={styles.wizardContainer}>
      <div className={styles.stepHeader}>
        <div className={styles.stepIndicator}>
          <div className={`${styles.stepBadge} ${step === 1 ? styles.stepBadgeActive : step > 1 ? styles.stepBadgeDone : ""}`}>
            <span className={styles.stepNumber}>1</span>
            <span>Account & Identity</span>
          </div>
          <div className={`${styles.stepBadge} ${step === 2 ? styles.stepBadgeActive : step > 2 ? styles.stepBadgeDone : ""}`}>
            <span className={styles.stepNumber}>2</span>
            <span>Location & ID</span>
          </div>
          <div className={`${styles.stepBadge} ${step === 3 ? styles.stepBadgeActive : step > 3 ? styles.stepBadgeDone : ""}`}>
            <span className={styles.stepNumber}>3</span>
            <span>Traffic & Funnels</span>
          </div>
          <div className={`${styles.stepBadge} ${step === 4 ? styles.stepBadgeActive : ""}`}>
            <span className={styles.stepNumber}>4</span>
            <span>Anti-Fraud Terms</span>
          </div>
        </div>

        {step === 1 && (
          <div>
            <h2 className={styles.stepTitle}>Step 1: Account Type & Contact Credentials</h2>
            <p className={styles.stepDescription}>
              TrafficVaultHub operates on strict zero-scammer verification. Provide legal details matching your official ID.
            </p>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className={styles.stepTitle}>Step 2: Physical Location & Government ID</h2>
            <p className={styles.stepDescription}>
              Required for KYC ledger compliance, legal payout routing, and duplicate-account prevention.
            </p>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className={styles.stepTitle}>Step 3: Traffic Strategy & Performance History</h2>
            <p className={styles.stepDescription}>
              Our compliance team reviews every marketing channel. Specificity is required; vague submissions are rejected.
            </p>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className={styles.stepTitle}>Step 4: Compliance Undertaking & Review Submission</h2>
            <p className={styles.stepDescription}>
              Review our zero-tolerance policies regarding synthetic conversions, bot traffic, and illegal creatives.
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className={styles.dangerBox} role="alert">
          {error}
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)}>
        {/* ================= STEP 1 ================= */}
        {step === 1 && (
          <div>
            <div className={styles.field}>
              <label>Applicant Account Type</label>
              <div className={styles.tagGroup}>
                {(["INDIVIDUAL", "COMPANY", "AGENCY"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`${styles.tagBtn} ${subType === t ? styles.tagBtnActive : ""}`}
                    onClick={() => setSubType(t)}
                  >
                    {t === "INDIVIDUAL" ? "Individual Media Buyer / Affiliate" : t === "COMPANY" ? "Registered Company / Media LLC" : "Marketing Agency"}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.formGrid2}>
              <div className={styles.field}>
                <label>Legal First Name *</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Legal name on passport/ID"
                />
              </div>
              <div className={styles.field}>
                <label>Legal Last Name *</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Family / surname"
                />
              </div>
            </div>

            {subType !== "INDIVIDUAL" && (
              <div className={styles.field}>
                <label>Company / Agency Legal Name *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Registered commercial entity name"
                />
              </div>
            )}

            <div className={styles.field}>
              <label>
                <span>Primary Email Address *</span>
                {isFreeEmail && (
                  <span style={{ color: "var(--color-warning)", fontSize: "0.78rem" }}>
                    Free email provider flagged for secondary KYC
                  </span>
                )}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@yourdomain.com (prefer custom domain)"
              />
              <span className={styles.helpText}>
                Free email providers (Gmail, Hotmail, etc.) are permitted but initiate manual background identity confirmation.
              </span>
            </div>

            <div className={styles.formGrid2}>
              <div className={styles.field}>
                <label>Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                />
              </div>
              <div className={styles.field}>
                <label>Confirm Password *</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                />
              </div>
            </div>

            <div className={styles.formGrid3}>
              <div className={styles.field}>
                <label>Direct Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 415 555 0192"
                />
              </div>
              <div className={styles.field}>
                <label>Preferred Contact Channel *</label>
                <select value={contactMethod} onChange={(e) => setContactMethod(e.target.value)}>
                  <option value="TELEGRAM">Telegram (Recommended)</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="SKYPE">Skype</option>
                  <option value="PHONE">Direct Telephone Call</option>
                  <option value="EMAIL">Email</option>
                </select>
              </div>
              <div className={styles.field}>
                <label>{contactMethod} Handle / ID *</label>
                <input
                  type="text"
                  required
                  value={contactHandle}
                  onChange={(e) => setContactHandle(e.target.value)}
                  placeholder="@handle or username"
                />
              </div>
            </div>

            <div className={styles.field}>
              <label>Timezone / Preferred Call Window</label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="e.g. UTC+1 (Central Europe), available 10:00–18:00"
              />
            </div>
          </div>
        )}

        {/* ================= STEP 2 ================= */}
        {step === 2 && (
          <div>
            <div className={styles.field}>
              <label>Full Physical Street Address *</label>
              <input
                type="text"
                required
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                placeholder="Street address, building / suite"
              />
            </div>

            <div className={styles.formGrid3}>
              <div className={styles.field}>
                <label>City *</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                />
              </div>
              <div className={styles.field}>
                <label>State / Province</label>
                <input
                  type="text"
                  value={stateProvince}
                  onChange={(e) => setStateProvince(e.target.value)}
                  placeholder="State / Region"
                />
              </div>
              <div className={styles.field}>
                <label>Postal / ZIP Code *</label>
                <input
                  type="text"
                  required
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="Postal Code"
                />
              </div>
            </div>

            <div className={styles.formGrid2}>
              <div className={styles.field}>
                <label>Country of Residence / Registration *</label>
                <input
                  type="text"
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. United States, Germany, United Kingdom"
                />
              </div>
              <div className={styles.field}>
                <label>Date of Birth (Must be 18+) *</label>
                <input
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginTop: "1rem", borderTop: "1px solid var(--color-border)", paddingTop: "1rem" }}>
              <div className={styles.field}>
                <label>Government-Issued Photo ID Document Type *</label>
                <select value={idType} onChange={(e) => setIdType(e.target.value)}>
                  <option value="PASSPORT">International Passport</option>
                  <option value="NATIONAL_ID">National Identity Card</option>
                  <option value="DRIVERS_LICENSE">Driver’s License</option>
                </select>
              </div>

              <div className={styles.formGrid2}>
                <div className={styles.field}>
                  <label>Document Front Photo / Scan *</label>
                  <div className={styles.fileDropzone}>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        if (e.target.files?.[0]) setIdFrontName(e.target.files[0].name);
                      }}
                    />
                    <div>📄 Click or drag front of ID here</div>
                    <span className={styles.helpText}>JPEG, PNG, or PDF up to 10MB</span>
                  </div>
                  {idFrontName && (
                    <div className={styles.uploadedFilePill}>
                      <span>✓ {idFrontName}</span>
                      <button type="button" onClick={() => setIdFrontName(null)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}>✕</button>
                    </div>
                  )}
                </div>

                <div className={styles.field}>
                  <label>Document Back Photo / Scan (Optional for Passport)</label>
                  <div className={styles.fileDropzone}>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        if (e.target.files?.[0]) setIdBackName(e.target.files[0].name);
                      }}
                    />
                    <div>📄 Click or drag back of ID here</div>
                    <span className={styles.helpText}>Required for National ID and Driver's License</span>
                  </div>
                  {idBackName && (
                    <div className={styles.uploadedFilePill}>
                      <span>✓ {idBackName}</span>
                      <button type="button" onClick={() => setIdBackName(null)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}>✕</button>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.field} style={{ marginTop: "0.5rem" }}>
                <label>Optional: Selfie Holding ID (Grants Accelerated Higher-Trust Tier)</label>
                <div className={styles.fileDropzone}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setSelfieName(e.target.files[0].name);
                    }}
                  />
                  <div>🤳 Upload verification selfie holding ID & note: "TrafficVaultHub 2026"</div>
                </div>
                {selfieName && (
                  <div className={styles.uploadedFilePill}>
                    <span>✓ {selfieName}</span>
                    <button type="button" onClick={() => setSelfieName(null)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}>✕</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 3 ================= */}
        {step === 3 && (
          <div>
            <div className={styles.formGrid2}>
              <div className={styles.field}>
                <label>Experience Level in Performance Marketing *</label>
                <select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)}>
                  <option value="BEGINNER">Beginner (Under 1 year)</option>
                  <option value="INTERMEDIATE">Intermediate (1–3 years with verified volume)</option>
                  <option value="ADVANCED">Advanced (3–5+ years large volume media buying)</option>
                  <option value="AGENCY">Agency / Media Team (5+ members)</option>
                </select>
              </div>

              <div className={styles.field}>
                <label>Years Active in Affiliate Marketing *</label>
                <input
                  type="number"
                  min={0}
                  max={25}
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(Number(e.target.value))}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label>Previous / Current CPA Networks Worked With & Approx. Monthly Volume</label>
              <input
                type="text"
                value={previousNetworks}
                onChange={(e) => setPreviousNetworks(e.target.value)}
                placeholder="e.g. MaxBounty ($25k/mo), ClickDealer ($10k/mo), Perform[cb]"
              />
              <span className={styles.helpText}>References with payment proofs drastically expedite verification.</span>
            </div>

            <div className={styles.field}>
              <label>Primary Traffic Sources You Direct / Buy (Select all that apply) *</label>
              <div className={styles.tagGroup}>
                {TRAFFIC_SOURCE_OPTIONS.map((src) => (
                  <button
                    key={src}
                    type="button"
                    className={`${styles.tagBtn} ${selectedSources.includes(src) ? styles.tagBtnActive : ""}`}
                    onClick={() => toggleSource(src)}
                  >
                    {src}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label>
                <span>Detailed Traffic Acquisition Methodology (Anti-Scam Core) *</span>
                <span className={styles.helpText}>{trafficDescription.length} chars (min 50)</span>
              </label>
              <textarea
                required
                value={trafficDescription}
                onChange={(e) => setTrafficDescription(e.target.value)}
                placeholder="Describe exactly how you acquire and monetize traffic. Be specific about GEOs, ad networks, funnels, pre-landers, and tracking macros. (e.g., 'We buy native traffic on Outbrain targeting US/CA finance audiences, sending visitors to custom review blogs before S2S tracking')."
              />
              <span className={styles.helpText}>
                Generic answers such as "social media", "all traffic", or "buy ads" result in immediate application rejection.
              </span>
            </div>

            <div className={styles.formGrid2}>
              <div className={styles.field}>
                <label>Estimated Monthly Traffic / Volume *</label>
                <select value={monthlyVolume} onChange={(e) => setMonthlyVolume(e.target.value)}>
                  <option value="Under 10,000 clicks/mo">Under 10,000 clicks/mo</option>
                  <option value="10,000–50,000 clicks/mo">10,000–50,000 clicks/mo</option>
                  <option value="50,000–200,000 clicks/mo">50,000–200,000 clicks/mo</option>
                  <option value="200,000+ clicks/mo (Super-Affiliate)">200,000+ clicks/mo (Super-Affiliate)</option>
                </select>
              </div>

              <div className={styles.field}>
                <label>Owned Websites / Pre-Lander Properties URL(s)</label>
                <input
                  type="text"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://myreviews.com, https://techdeals.io"
                />
              </div>
            </div>

            <div className={styles.field}>
              <label>Target Verticals of Interest</label>
              <div className={styles.tagGroup}>
                {VERTICAL_OPTIONS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`${styles.tagBtn} ${selectedVerticals.includes(v) ? styles.tagBtnActive : ""}`}
                    onClick={() => toggleVertical(v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.checkboxCard} onClick={() => setIncentivizedTraffic(!incentivizedTraffic)}>
              <input
                type="checkbox"
                checked={incentivizedTraffic}
                onChange={(e) => setIncentivizedTraffic(e.target.checked)}
              />
              <div>
                <strong>Do you run incentivized, reward-based, or content-locking traffic?</strong>
                <div className={styles.helpText}>
                  Most offers strictly forbid incentive traffic. If Yes, you must declare it here.
                </div>
              </div>
            </div>

            {incentivizedTraffic && (
              <div className={styles.field}>
                <label>Incentive Traffic Mechanics & Safeguards *</label>
                <input
                  type="text"
                  required
                  value={incentiveDetails}
                  onChange={(e) => setIncentiveDetails(e.target.value)}
                  placeholder="Describe your reward system, virtual currency, or offerwall"
                />
              </div>
            )}

            <div className={styles.checkboxCard} onClick={() => setProhibitedMethodsAccepted(!prohibitedMethodsAccepted)}>
              <input
                type="checkbox"
                checked={prohibitedMethodsAccepted}
                onChange={(e) => setProhibitedMethodsAccepted(e.target.checked)}
              />
              <div>
                <strong style={{ color: "var(--color-text-primary)" }}>
                  Mandatory Anti-Fraud Negative Affirmation *
                </strong>
                <div style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
                  I confirm that I will NEVER use: automated headless bots, cookie stuffing, fake celebrity or news endorsements, brand-bidding trademark infringements, hidden iframes, or unconsented pop-unders.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 4 ================= */}
        {step === 4 && (
          <div>
            <div className={styles.warningBox}>
              <div>⚖️</div>
              <div>
                <strong>Auditable Legal Accountability & Forfeiture Terms</strong>
                <div style={{ marginTop: "0.2rem" }}>
                  TrafficVaultHub uses cryptographic S2S conversion integrity and double-entry journals. Any detected affiliate fraud immediately voids all pending balances and is referred to international cybercrime registers.
                </div>
              </div>
            </div>

            <div className={styles.checkboxCard} onClick={() => setTermsAccepted(!termsAccepted)}>
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              <div>
                <strong>I accept the TrafficVaultHub Publisher Terms of Service *</strong>
                <div className={styles.helpText}>
                  Includes minimum $50 disbursement thresholds, Net-15/Net-30 hold periods for unverified traffic, and strict compliance with advertiser landing guidelines.
                </div>
              </div>
            </div>

            <div className={styles.checkboxCard} onClick={() => setAntiFraudAccepted(!antiFraudAccepted)}>
              <input
                type="checkbox"
                checked={antiFraudAccepted}
                onChange={(e) => setAntiFraudAccepted(e.target.checked)}
              />
              <div>
                <strong>I accept the Zero-Tolerance Anti-Fraud & Quality Policy *</strong>
                <div className={styles.helpText}>
                  Conversions reversed due to chargebacks, confirmed bot patterns, or proxy farming will trigger immediate account suspension and ledger reversal.
                </div>
              </div>
            </div>

            <div className={styles.checkboxCard} onClick={() => setPenaltyAccepted(!penaltyAccepted)}>
              <input
                type="checkbox"
                checked={penaltyAccepted}
                onChange={(e) => setPenaltyAccepted(e.target.checked)}
              />
              <div>
                <strong>I understand that providing false identity information triggers permanent banning *</strong>
                <div className={styles.helpText}>
                  Self-declared details must strictly match your uploaded government ID. Multi-accounting without platform authorization is strictly forbidden.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions Row */}
        <div className={styles.actionsRow}>
          {step > 1 ? (
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => {
                setError(null);
                setStep(step - 1);
              }}
            >
              ← Previous Step
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => {
                if (validateStep(step)) {
                  setStep(step + 1);
                }
              }}
            >
              Continue to Step {step + 1} →
            </button>
          ) : (
            <button type="submit" className={styles.btnPrimary} disabled={submitting}>
              {submitting ? "Submitting for Compliance Audit..." : "Submit Application for Manual Review 🛡️"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
