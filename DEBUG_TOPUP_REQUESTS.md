# Debug Guide: Top-Up Requests Not Showing in Admin Panel

## Database Status ✅
- **Table:** `topup_requests` exists
- **Records:** 6 pending requests confirmed
- **Data:** All fields populated correctly (participant_email, amount, status, transaction_id)
- **Issue:** Data is NOT being fetched by admin panel

---

## Step 1: Check VPS Logs

SSH into your VPS and check the application logs:

```bash
ssh user@YOUR_VPS_IP
cd /path/to/praymid

# If running with PM2
pm2 logs

# If running with npm
# Check terminal output

# Or check system logs
tail -f /var/log/syslog | grep praymid
```

**Look for console logs starting with `[v0]` - they should show:**
```
[v0] Fetching topup requests from /api/admin/topup-requests
[v0] Response status: 200
[v0] Database returned 6 topup requests
[v0] First request sample: {...}
```

---

## Step 2: Test API Directly

From your VPS or locally, test the API endpoint:

```bash
# Get your admin token first
# From browser console while logged in as admin:
# localStorage.getItem("admin_token")

curl -X GET http://YOUR_VPS_IP:3000/api/admin/topup-requests \
  -H "X-Admin-Token: YOUR_ADMIN_TOKEN_HERE" \
  -H "Content-Type: application/json"

# Should return:
# {"success":true,"requests":[...]}
```

---

## Step 3: Check Browser Console

On your VPS domain, logged in as admin:

1. **Open DevTools:** Press `F12` (or `Cmd+Option+I` on Mac)
2. **Go to Console tab**
3. **Open Admin → Top-Up Requests tab**
4. **Look for `[v0]` debug messages**

**You should see:**
```
[v0] Fetching topup requests from /api/admin/topup-requests
[v0] Response status: 200
[v0] Response data: {success: true, requests: Array(6)}
[v0] Mapped requests: Array(6)
```

---

## Step 4: Check Admin Authentication

Run this in browser console while logged in:

```javascript
// Check if admin token exists
console.log(localStorage.getItem("admin_token"));

// Check admin data
console.log(localStorage.getItem("admin_email"));
console.log(localStorage.getItem("admin_role"));
```

**Should return non-null values for all three.**

---

## Step 5: Check Network Request

In browser DevTools:

1. **Go to Network tab**
2. **Refresh admin panel**
3. **Look for request to `/api/admin/topup-requests`**
4. **Check:**
   - **Status:** Should be `200` (not 401, 403, or 500)
   - **Headers:** Should have `x-admin-token` header
   - **Response:** Should contain `{"success":true,"requests":[...]}`

---

## Common Issues & Fixes

### Issue 1: Request returns 401 (Unauthorized)
**Cause:** Admin token missing or invalid
**Fix:**
1. Log out and log back in as admin
2. Verify token is saved in localStorage
3. Check admin credentials in database

### Issue 2: Request returns 0 records
**Cause:** Data didn't insert into database
**Fix:** Check participant topup submission

### Issue 3: Request returns 500 (Internal Server Error)
**Cause:** Database query failed
**Fix:**
1. Check database connection
2. Verify `topup_requests` table exists
3. Check application logs for error details

### Issue 4: Response is received but not showing in UI
**Cause:** Status filter or component rendering issue
**Fix:**
1. Check status filter is set to "All" or "Pending"
2. Hard refresh browser (Ctrl+Shift+R)
3. Clear browser cache

---

## Manual Verification SQL

Run this on your VPS database to verify data:

```sql
-- Count pending topup requests
SELECT COUNT(*) FROM topup_requests WHERE status = 'pending';

-- Show all topup requests
SELECT id, participant_email, amount, status, created_at 
FROM topup_requests 
ORDER BY created_at DESC;

-- Show first 6 records (your data)
SELECT * FROM topup_requests LIMIT 6;
```

---

## If Still Not Working

**Run this on your VPS:**

```bash
# Restart the application
pm2 restart all

# Or if using npm
# Kill the process and restart
npm run dev
```

Then:
1. Refresh browser
2. Check console logs again
3. Report the `[v0]` debug messages

---

## Quick Checklist

✅ Database has 6 records  
✅ Admin is logged in  
✅ Network request shows 200 status  
✅ Response contains `"success": true`  
✅ Browser console shows no errors  
✅ `[v0]` debug logs show fetching complete  

**If all checkboxes are checked but data still doesn't show:**
- Clear browser cache (Cmd+Shift+Delete)
- Log out and back in
- Force refresh (Ctrl+Shift+R)
