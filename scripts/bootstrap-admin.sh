#!/usr/bin/env bash
# ==============================================================================
# TrafficVaultHub — Secure One-Time Platform Administrator Bootstrap
#
# SECURITY DIRECTIVE:
# - This script NEVER stores passwords, secrets, or tokens in files or git.
# - Prompts for credentials interactively using silent stdin (`read -s`).
# - Transmits credentials securely over HTTPS to the one-time bootstrap endpoint.
# - The bootstrap endpoint is permanently locked once the first admin is initialized.
# ==============================================================================

set -euo pipefail

echo ""
echo "========================================================================"
echo "  TrafficVaultHub — Secure Platform Operator Bootstrap Utility"
echo "========================================================================"
echo "Target administrator identity: ubuttomkumar@gmail.com"
echo "This operation promotes/initializes the super_admin operator account."
echo ""

# 1. Target Endpoint
DEFAULT_API="https://trafficvaulthub.uttombarmon45.workers.dev"
read -r -p "Enter API Base URL [$DEFAULT_API]: " INPUT_API
API_URL="${INPUT_API:-$DEFAULT_API}"
API_URL="${API_URL%/}"

# 2. Admin Email
DEFAULT_EMAIL="ubuttomkumar@gmail.com"
read -r -p "Enter Admin Email Address [$DEFAULT_EMAIL]: " INPUT_EMAIL
ADMIN_EMAIL="${INPUT_EMAIL:-$DEFAULT_EMAIL}"

# 3. Display Name
DEFAULT_NAME="Platform Super Administrator"
read -r -p "Enter Operator Display Name [$DEFAULT_NAME]: " INPUT_NAME
ADMIN_NAME="${INPUT_NAME:-$DEFAULT_NAME}"

# 4. Bootstrap Secret (Silent Input)
echo ""
echo "Enter the BOOTSTRAP_SECRET configured on your Cloudflare Worker"
echo "(Input will be hidden for security):"
read -s -r -p "BOOTSTRAP_SECRET: " BOOTSTRAP_SECRET
echo ""

if [ -z "$BOOTSTRAP_SECRET" ]; then
  echo "Error: BOOTSTRAP_SECRET cannot be empty."
  exit 1
fi

# 5. Master Password (Silent Input)
echo ""
echo "Enter Master Password for $ADMIN_EMAIL"
echo "Requirements: Min 12 chars, uppercase (A-Z), lowercase (a-z), digit (0-9), symbol (!@#$...)"
echo "(Input will be hidden):"
read -s -r -p "New Master Password: " ADMIN_PASSWORD
echo ""

if [ ${#ADMIN_PASSWORD} -lt 12 ]; then
  echo "Error: Password must be at least 12 characters long."
  unset ADMIN_PASSWORD BOOTSTRAP_SECRET
  exit 1
fi

read -s -r -p "Confirm Master Password: " CONFIRM_PASSWORD
echo ""

if [ "$ADMIN_PASSWORD" != "$CONFIRM_PASSWORD" ]; then
  echo "Error: Passwords do not match."
  unset ADMIN_PASSWORD CONFIRM_PASSWORD BOOTSTRAP_SECRET
  exit 1
fi

echo ""
echo "Dispatching secure one-time bootstrap request to $API_URL/api/v1/admin/bootstrap..."

PAYLOAD=$(cat <<EOF
{
  "email": "$ADMIN_EMAIL",
  "password": "$ADMIN_PASSWORD",
  "displayName": "$ADMIN_NAME"
}
EOF
)

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/v1/admin/bootstrap" \
  -H "Content-Type: application/json" \
  -H "x-bootstrap-secret: $BOOTSTRAP_SECRET" \
  -d "$PAYLOAD")

# Wipe sensitive credentials from shell memory immediately
unset ADMIN_PASSWORD CONFIRM_PASSWORD BOOTSTRAP_SECRET PAYLOAD

HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo ""
if [ "$HTTP_STATUS" -eq 201 ]; then
  echo "✅ Bootstrap SUCCESS (HTTP 201)"
  echo "Response: $BODY"
  echo ""
  echo "The administrator account ($ADMIN_EMAIL) is now fully active with Super Admin role."
  echo "The bootstrap endpoint has been permanently locked against subsequent execution."
  echo ""
  echo "You can now sign in at: https://trafficvaulthub.pages.dev/admin/login"
else
  echo "❌ Bootstrap FAILED (HTTP $HTTP_STATUS)"
  echo "Error details: $BODY"
  echo ""
  echo "Troubleshooting:"
  echo "- HTTP 401: BOOTSTRAP_SECRET mismatch. Verify secret set via 'wrangler secret put BOOTSTRAP_SECRET'."
  echo "- HTTP 409: An administrator already exists on this platform. Bootstrap is permanently disabled."
  echo "- HTTP 400: Password complexity requirements not satisfied."
  exit 1
fi
