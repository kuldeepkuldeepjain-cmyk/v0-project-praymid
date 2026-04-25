# ZAVU OTP INTEGRATION GUIDE
# Complete Step-by-Step Guide for Beginners
# Service: zavu.dev (WhatsApp OTP delivery)
# ============================================================

## WHAT IS ZAVU?

Zavu (zavu.dev) sends your OTP codes via WhatsApp.
When a user registers, they enter their mobile number.
Your app sends the OTP to Zavu's API.
Zavu delivers the 6-digit code to the user's WhatsApp in seconds.
The user types it in — registration complete.

---

## IMPORTANT NOTES BEFORE STARTING

1. Zavu sends OTP via WHATSAPP — not SMS.
   The user must have WhatsApp installed on their phone.

2. Zavu requires a Meta Business Account (Facebook Business).
   This is free to create.

3. You need to create an OTP template and get it approved by Meta.
   Authentication templates are approved in 1-4 hours usually.

4. Your code is ALREADY WRITTEN and ready.
   You only need to do the Zavu setup and add 3 env variables.

---

## PART 1 — CREATE YOUR ZAVU ACCOUNT

STEP 1: Go to https://zavu.dev
STEP 2: Click "Sign Up" or "Get Started"
STEP 3: Enter your name, email, and password
STEP 4: Verify your email by clicking the link they send you
STEP 5: Log in to the Zavu Dashboard

---

## PART 2 — GET YOUR API KEY

STEP 1: Inside Zavu Dashboard, look at the left sidebar
STEP 2: Click on "Settings"
STEP 3: Click on "API Keys" (inside Settings)
STEP 4: Click the button "Create API Key"
STEP 5: Give it a name — type "Praymid Production"
STEP 6: Click "Create"
STEP 7: A key will appear starting with "zv_live_xxxxxxxxx"
         COPY IT NOW — it is shown only once!
         Paste it in Notepad immediately.

---

## PART 3 — CREATE A SENDER (WhatsApp Business Number)

STEP 1: In the left sidebar, click "Senders"
STEP 2: Click "Create Sender" or "Add Sender"
STEP 3: You will need to connect a WhatsApp Business number.
         You have 2 options:

   OPTION A — Use your own number:
   - Enter your business phone number
   - Zavu will verify it via WhatsApp
   - You cannot use this number on WhatsApp personal after this

   OPTION B — Buy a number from Zavu:
   - Click "Buy a number" in the Senders section
   - Choose a country and number
   - This costs a small monthly fee

STEP 4: After the sender is created, note the SENDER ID.
         It looks like: snd_abc123
         Copy and save it.

---

## PART 4 — CONNECT META BUSINESS (WhatsApp Business API)

This is required for WhatsApp OTP to work.

STEP 1: Go to https://business.facebook.com and create a free Meta Business account
         (if you already have one, log in)

STEP 2: Back in Zavu Dashboard → Senders → click your sender

STEP 3: Look for "Connect WhatsApp" or "WhatsApp Business Account"

STEP 4: Click it — it will open Facebook login

STEP 5: Log in with your Facebook account

STEP 6: Follow the steps to connect your WhatsApp number to Meta Business

STEP 7: Verify your number via the code WhatsApp sends

STEP 8: Once connected, your sender will show "WhatsApp Connected" status

---

## PART 5 — CREATE THE OTP TEMPLATE

The OTP message must be a pre-approved template. Here are the steps:

STEP 1: In Zavu Dashboard → Senders → click your sender

STEP 2: Click the "Templates" tab

STEP 3: Click "Create Template"

STEP 4: Fill in the form exactly like this:

   Name:     otp_verification
   Channel:  WhatsApp
   Category: AUTHENTICATION
   Language: English (en)

STEP 5: For the OTP Button section:
   Button Type: Copy Code   (choose this — works on all phones)

STEP 6: Optional settings:
   Enable "Security Recommendation"  → YES (toggle it ON)
   Code Expiration: 10 minutes

STEP 7: Click "Create"

The template will auto-generate this message to users:
   "123456 is your verification code.
    For your security, do not share this code.
    This code expires in 10 minutes.
    [Copy code]"

---

## PART 6 — SUBMIT TEMPLATE FOR META APPROVAL

STEP 1: In Templates tab, find your "otp_verification" template
         Its status will show "Draft"

STEP 2: Click the three dots (...) next to it

STEP 3: Click "Submit for Approval"

STEP 4: Wait for approval — usually 1 to 4 hours for AUTHENTICATION type

STEP 5: Once approved, the status changes to "Approved"

STEP 6: Copy the TEMPLATE ID — it looks like: tmpl_abc123
         Save it in Notepad.

---

## PART 7 — GET YOUR API URL

The Zavu API endpoint for sending messages is:

   https://api.zavu.dev/v1/messages

This is fixed — you do not need to find it anywhere in the dashboard.

---

## PART 8 — ADD ENVIRONMENT VARIABLES TO v0

Now you have 3 values to add:

1. ZAVU_API_KEY      = zv_live_xxxxxxxxxxxxxxxx   (from Part 2)
2. ZAVU_TEMPLATE_ID  = tmpl_abc123                (from Part 6)
3. ZAVU_SENDER_ID    = snd_abc123                 (from Part 3)

HOW TO ADD THEM IN v0:

STEP 1: Open v0 (your project)
STEP 2: Click the Settings icon (top right corner)
STEP 3: Click "Vars" tab
STEP 4: Click "Add Variable"
STEP 5: Add each one:
         Key: ZAVU_API_KEY
         Value: (paste your key)
         Click Save

STEP 6: Repeat for ZAVU_TEMPLATE_ID and ZAVU_SENDER_ID

---

## PART 9 — UPDATE THE CODE IN YOUR PROJECT

The current code sends a raw SMS. We need to update it to use
Zavu's WhatsApp template system.

Tell v0 (me): "Update the OTP code to use Zavu WhatsApp template"
and I will update the file:
   app/api/participant/send-mobile-otp/route.ts

The updated code will:
1. Generate a 6-digit OTP
2. Store it in database (or memory store as fallback)
3. Call Zavu API with your template ID and OTP code
4. Zavu delivers it to user's WhatsApp

---

## PART 10 — TEST IT

STEP 1: Open your registration page in the browser
STEP 2: Enter a mobile number (with country code, e.g., +91XXXXXXXXXX)
STEP 3: Click "Send OTP"
STEP 4: Check WhatsApp on that phone number
STEP 5: You should receive:
         "123456 is your verification code.
          For your security, do not share this code."
STEP 6: Type the code in the OTP field
STEP 7: Click Verify — it should say "Verified!"

---

## TESTING WITHOUT REAL WHATSAPP (During Development)

Zavu provides test API keys starting with "zv_test_"
Test keys simulate sending but don't actually deliver messages.

In test mode, the OTP is returned in the API response so you can test
the full flow without a real WhatsApp message.

To use test mode: create a test API key in Zavu Dashboard → Settings → API Keys
Use prefix: zv_test_

---

## PRICING (as of April 2026)

- WhatsApp Authentication messages are the CHEAPEST category on WhatsApp
- Zavu has a free tier for testing
- For production: check current pricing at https://zavu.dev/pricing
- Typical cost: $0.005 to $0.015 per OTP message depending on country

---

## COMMON ERRORS AND FIXES

ERROR: "Template not found"
FIX: Make sure ZAVU_TEMPLATE_ID is correct and template is "Approved" not "Draft"

ERROR: "Sender not configured"
FIX: Make sure ZAVU_SENDER_ID is correct and WhatsApp is connected to the sender

ERROR: "Message not delivered"
FIX: Make sure the recipient phone number includes country code (+91XXXXXXXXXX)

ERROR: "Unauthorized"
FIX: Check ZAVU_API_KEY — make sure you copied it fully with no spaces

ERROR: "Meta Business not verified"
FIX: Complete Meta Business verification at https://business.facebook.com

---

## SUMMARY — WHAT YOU NEED BEFORE TELLING ME TO UPDATE THE CODE

Checklist:
[ ] Zavu account created at zavu.dev
[ ] API key copied (zv_live_...)
[ ] Sender created and WhatsApp connected
[ ] Sender ID copied (snd_...)
[ ] OTP template created with name "otp_verification" category AUTHENTICATION
[ ] Template submitted and approved by Meta
[ ] Template ID copied (tmpl_...)
[ ] All 3 env variables added in v0 → Settings → Vars

Once all boxes are checked, tell me:
"Update OTP code to use Zavu WhatsApp template"
and I will update the send-mobile-otp route instantly.

---

## FILE TO BE UPDATED BY v0

app/api/participant/send-mobile-otp/route.ts

Current behavior: tries to send via raw HTTP to Zavu (SMS style)
After update:     sends via Zavu WhatsApp template API (proper method)

The verify-mobile-otp route does NOT need changes.
It only checks the OTP code against the database — Zavu is not involved there.
