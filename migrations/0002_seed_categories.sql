-- Seed initial category catalog (PRD §3.1)
-- IDs are stable UUIDs for relationships; slugs are unique.

INSERT OR IGNORE INTO offer_categories (id, slug, name, description, parent_id, sort_order, is_active, risk_classification) VALUES
  ('cat_dating', 'dating-relationships', 'Dating & Relationships', 'Dating, matchmaking and relationship services', NULL, 10, 1, 'elevated'),
  ('cat_dating_mainstream', 'mainstream-dating', 'Mainstream Dating', NULL, 'cat_dating', 11, 1, 'standard'),
  ('cat_dating_adult', 'adult-dating', 'Adult Dating', 'Restricted category — requires compliance review', 'cat_dating', 12, 1, 'restricted'),
  ('cat_dating_matchmaking', 'matchmaking', 'Matchmaking', NULL, 'cat_dating', 13, 1, 'standard'),
  ('cat_dating_rel_svc', 'relationship-services', 'Relationship Services', NULL, 'cat_dating', 14, 1, 'standard'),
  ('cat_dating_apps', 'dating-applications', 'Dating Applications', NULL, 'cat_dating', 15, 1, 'standard'),
  ('cat_dating_memberships', 'dating-memberships', 'Dating Memberships', NULL, 'cat_dating', 16, 1, 'standard'),

  ('cat_mobile', 'mobile-apps-software', 'Mobile Applications & Software', NULL, NULL, 20, 1, 'standard'),
  ('cat_mobile_android', 'android-apps', 'Android Apps', NULL, 'cat_mobile', 21, 1, 'standard'),
  ('cat_mobile_ios', 'ios-apps', 'iOS Apps', NULL, 'cat_mobile', 22, 1, 'standard'),
  ('cat_mobile_software', 'software-downloads', 'Software Downloads', NULL, 'cat_mobile', 23, 1, 'standard'),
  ('cat_mobile_saas', 'saas', 'SaaS', NULL, 'cat_mobile', 24, 1, 'standard'),
  ('cat_mobile_vpn', 'vpn-cybersecurity', 'VPN & Cybersecurity', NULL, 'cat_mobile', 25, 1, 'standard'),
  ('cat_mobile_prod', 'productivity-tools', 'Productivity Tools', NULL, 'cat_mobile', 26, 1, 'standard'),

  ('cat_gaming', 'gaming-entertainment', 'Gaming & Entertainment', NULL, NULL, 30, 1, 'standard'),
  ('cat_gaming_mobile', 'mobile-games', 'Mobile Games', NULL, 'cat_gaming', 31, 1, 'standard'),
  ('cat_gaming_pc', 'pc-games', 'PC Games', NULL, 'cat_gaming', 32, 1, 'standard'),
  ('cat_gaming_sub', 'gaming-subscriptions', 'Gaming Subscriptions', NULL, 'cat_gaming', 33, 1, 'standard'),
  ('cat_gaming_ent', 'entertainment-services', 'Entertainment Services', NULL, 'cat_gaming', 34, 1, 'standard'),

  ('cat_ecom', 'ecommerce-retail', 'E-commerce & Retail', NULL, NULL, 40, 1, 'standard'),
  ('cat_ecom_physical', 'physical-products', 'Physical Products', NULL, 'cat_ecom', 41, 1, 'standard'),
  ('cat_ecom_digital', 'digital-products', 'Digital Products', NULL, 'cat_ecom', 42, 1, 'standard'),
  ('cat_ecom_coupons', 'coupons-cashback', 'Coupons & Cashback', NULL, 'cat_ecom', 43, 1, 'standard'),
  ('cat_ecom_sub', 'subscription-commerce', 'Subscription Commerce', NULL, 'cat_ecom', 44, 1, 'standard'),

  ('cat_finance', 'finance-business', 'Finance & Business', NULL, NULL, 50, 1, 'elevated'),
  ('cat_finance_leads', 'business-leads', 'Business Leads', NULL, 'cat_finance', 51, 1, 'elevated'),
  ('cat_finance_eligible', 'eligible-financial-services', 'Eligible Financial Services', NULL, 'cat_finance', 52, 1, 'elevated'),
  ('cat_finance_acct', 'accounting-business-software', 'Accounting & Business Software', NULL, 'cat_finance', 53, 1, 'standard'),
  ('cat_finance_b2b', 'b2b-saas', 'B2B SaaS', NULL, 'cat_finance', 54, 1, 'standard'),

  ('cat_edu', 'education-employment', 'Education & Employment', NULL, NULL, 60, 1, 'standard'),
  ('cat_edu_courses', 'online-courses', 'Online Courses', NULL, 'cat_edu', 61, 1, 'standard'),
  ('cat_edu_training', 'training', 'Training', NULL, 'cat_edu', 62, 1, 'standard'),
  ('cat_edu_recruit', 'recruitment-leads', 'Recruitment Leads', NULL, 'cat_edu', 63, 1, 'standard'),
  ('cat_edu_career', 'career-services', 'Career Services', NULL, 'cat_edu', 64, 1, 'standard'),

  ('cat_travel', 'travel-hospitality', 'Travel & Hospitality', NULL, NULL, 70, 1, 'standard'),
  ('cat_travel_bookings', 'travel-bookings', 'Travel Bookings', NULL, 'cat_travel', 71, 1, 'standard'),
  ('cat_travel_hotels', 'hotels', 'Hotels', NULL, 'cat_travel', 72, 1, 'standard'),
  ('cat_travel_svc', 'travel-services', 'Travel Services', NULL, 'cat_travel', 73, 1, 'standard'),

  ('cat_health', 'health-wellness-lifestyle', 'Health, Wellness & Lifestyle', NULL, NULL, 80, 1, 'elevated'),
  ('cat_health_eligible', 'eligible-healthcare-services', 'Eligible Healthcare Services', NULL, 'cat_health', 81, 1, 'elevated'),
  ('cat_health_wellness', 'wellness-services', 'Wellness Services', NULL, 'cat_health', 82, 1, 'standard'),
  ('cat_health_fitness', 'fitness-applications', 'Fitness Applications', NULL, 'cat_health', 83, 1, 'standard'),

  ('cat_home', 'home-local-services', 'Home & Local Services', NULL, NULL, 90, 1, 'standard'),
  ('cat_home_improve', 'home-improvement-leads', 'Home Improvement Leads', NULL, 'cat_home', 91, 1, 'standard'),
  ('cat_home_local', 'local-service-leads', 'Local Service Leads', NULL, 'cat_home', 92, 1, 'standard'),
  ('cat_home_pro', 'professional-services', 'Professional Services', NULL, 'cat_home', 93, 1, 'standard'),

  ('cat_media', 'media-content', 'Media & Content', NULL, NULL, 100, 1, 'standard'),
  ('cat_media_sub', 'content-subscriptions', 'Content Subscriptions', NULL, 'cat_media', 101, 1, 'standard'),
  ('cat_media_pub', 'publishing', 'Publishing', NULL, 'cat_media', 102, 1, 'standard'),
  ('cat_media_creator', 'eligible-creator-tools', 'Eligible Creator Tools', NULL, 'cat_media', 103, 1, 'standard'),

  ('cat_surveys', 'surveys-research-rewards', 'Surveys, Research & Rewards', NULL, NULL, 110, 1, 'standard'),
  ('cat_surveys_research', 'market-research', 'Market Research', NULL, 'cat_surveys', 111, 1, 'standard'),
  ('cat_surveys_surveys', 'surveys', 'Surveys', NULL, 'cat_surveys', 112, 1, 'standard'),
  ('cat_surveys_rewards', 'eligible-reward-programs', 'Eligible Reward Programs', NULL, 'cat_surveys', 113, 1, 'standard'),

  ('cat_other', 'other', 'Other', 'Custom approved categories', NULL, 120, 1, 'standard'),
  ('cat_other_custom', 'custom-approved-category', 'Custom Approved Category', NULL, 'cat_other', 121, 1, 'standard');
