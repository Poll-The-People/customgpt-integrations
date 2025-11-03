# Agent Name Troubleshooting Guide

## Issue: Seeing "AI Assistant" instead of your agent's name

This guide helps you diagnose why your CustomGPT agent name isn't displaying correctly.

## Quick Diagnosis

### 1. Check Browser Console

Open your browser's developer tools (F12) and look for these log messages:

```
[Agent Settings] Successfully fetched from CustomGPT: { title: "Your Agent Name", hasAvatar: true }
```

**If you see this**: ✅ API is working correctly, agent name is being fetched

**If you see this instead**:
```
[Agent Settings] CustomGPT not configured, using defaults
[Agent Settings] Using fallback settings with title: AI Assistant
```
→ Go to **Section 2: Check Configuration**

**If you see this**:
```
[Agent Settings] CustomGPT API call failed: Error: ...
[Agent Settings] Using fallback settings with title: AI Assistant
```
→ Go to **Section 3: Check API Credentials**

### 2. Check Configuration

Open your `.env.local` file and verify:

```env
USE_CUSTOMGPT=true                    # Must be exactly "true" (lowercase)
CUSTOMGPT_PROJECT_ID=12345            # Your actual project ID (number)
CUSTOMGPT_API_KEY=cgpt-xxxxx          # Your actual API key
```

**Common mistakes:**
- ❌ `USE_CUSTOMGPT=TRUE` (uppercase doesn't work)
- ❌ `USE_CUSTOMGPT="true"` (quotes break parsing)
- ❌ Missing project ID or API key
- ❌ Wrong project ID (check CustomGPT dashboard)

### 3. Check API Credentials

Test your CustomGPT API directly:

```bash
curl -X GET "https://app.customgpt.ai/api/v1/projects/YOUR_PROJECT_ID/settings" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Expected response:**
```json
{
  "status": "success",
  "data": {
    "chatbot_title": "Your Agent Name",
    "chatbot_avatar": "...",
    ...
  }
}
```

**If you get an error:**
- 401 Unauthorized → API key is invalid
- 404 Not Found → Project ID is wrong
- 403 Forbidden → API key doesn't have permission

### 4. Check Network Tab

In browser DevTools → Network tab, look for the request to `/api/agent/settings`:

**Status 200**: Check the response body for `chatbot_title` field
**Status 500**: Server error, check server logs (Vercel logs if deployed)
**No request**: Component isn't calling the API (check `useAgentSettings` hook)

## Solution Path

### Path A: Using CustomGPT (Most Common)

1. **Set environment variables in `.env.local`:**
   ```env
   USE_CUSTOMGPT=true
   CUSTOMGPT_PROJECT_ID=your_project_id
   CUSTOMGPT_API_KEY=cgpt-your-key
   ```

2. **Restart development server:**
   ```bash
   # Kill the current server (Ctrl+C)
   npm run dev
   ```

3. **Verify in browser console:**
   - Should see: `[Agent Settings] Successfully fetched from CustomGPT`
   - Agent name should appear in UI

4. **If still showing "AI Assistant":**
   - Check CustomGPT dashboard → Your project → Settings
   - Verify "Chatbot Title" field is set
   - If empty, set it and save
   - Refresh your app

### Path B: Using Custom Name (Without CustomGPT)

If you're NOT using CustomGPT or want to override the name:

1. **Set environment variables:**
   ```env
   USE_CUSTOMGPT=false
   CHATBOT_TITLE=My Custom Agent Name
   ```

2. **Restart development server:**
   ```bash
   npm run dev
   ```

3. **Verify in browser console:**
   - Should see: `[Agent Settings] CustomGPT not configured, using defaults`
   - Should see: `[Agent Settings] Using fallback settings with title: My Custom Agent Name`

### Path C: Vercel Deployment

If it works locally but not on Vercel:

1. **Go to Vercel Dashboard** → Your project → Settings → Environment Variables

2. **Add these variables:**
   ```
   USE_CUSTOMGPT = true
   CUSTOMGPT_PROJECT_ID = your_project_id
   CUSTOMGPT_API_KEY = cgpt-your-key
   ```

3. **Important:** After adding env vars, **redeploy**:
   - Go to Deployments tab
   - Click "..." menu on latest deployment
   - Click "Redeploy"
   - OR push a new commit to trigger deployment

4. **Check Vercel logs:**
   - Go to Deployments → Click on deployment → Runtime Logs
   - Look for `[Agent Settings]` messages

## Common Issues & Solutions

### Issue 1: Name appears briefly, then changes to "AI Assistant"

**Cause**: API call is slow, showing fallback first, then updating

**Solution**: This is normal! The name should update within 1-2 seconds.

**Verify**: Check for React hydration warnings in console

---

### Issue 2: Different name in different parts of the app

**Cause**: Some components aren't using `useAgentSettings` hook

**Solution**: Check these files are using `assistantName` from the hook:
- `ChatContainer.tsx` ✅ (fixed)
- `VoiceMode.tsx` (if applicable)
- `AvatarMode.tsx` (if applicable)

---

### Issue 3: Works in dev, fails in production

**Cause**: Environment variables not set in Vercel

**Solution**: See **Path C** above

---

### Issue 4: API key works but name still wrong

**Cause**: CustomGPT project settings don't have chatbot title set

**Solution**:
1. Go to CustomGPT dashboard
2. Select your project
3. Go to Settings → Chatbot Settings
4. Set "Chatbot Title" field
5. Save
6. Refresh your app

---

### Issue 5: "AI Assistant" in typing indicator

**Cause**: This is expected! The typing indicator uses the agent name.

**Verify**: Check line 942 in `ChatContainer.tsx`:
```tsx
<span className="message-sender">{assistantName}</span>
```

This should be using the dynamic `assistantName` variable now.

---

## Testing Checklist

Run through this checklist to verify everything works:

- [ ] Environment variables set in `.env.local`
- [ ] Development server restarted after env changes
- [ ] Browser console shows `[Agent Settings]` logs
- [ ] Agent name appears in chat header
- [ ] Agent name appears in message bubbles
- [ ] Agent name appears in typing indicator
- [ ] Agent name appears in empty state
- [ ] Works in production (Vercel) if deployed

## Still Not Working?

### Debug Mode

Add this to your `.env.local` for extra logging:
```env
NODE_ENV=development
DEBUG=true
```

Then check browser console for detailed logs.

### Manual API Test

Test the settings endpoint directly in your browser:
```
http://localhost:3000/api/agent/settings
```

Expected response:
```json
{
  "chatbot_title": "Your Agent Name",
  "chatbot_avatar": "...",
  "user_name": "You",
  ...
}
```

If you see `"chatbot_title": "AI Assistant"`, the issue is with the API call, not the frontend.

### Contact Support

If nothing works:
1. Check CustomGPT API status
2. Verify your API key permissions
3. Open an issue with:
   - Browser console logs
   - Network tab screenshot
   - Environment variable values (redact API keys!)
   - Server logs (Vercel logs if deployed)

## Summary

**The agent name flow:**

1. Component renders → `useAgentSettings` hook called
2. Hook fetches from `/api/agent/settings`
3. API checks if `USE_CUSTOMGPT=true` and credentials exist
4. If yes → Fetch from CustomGPT API → Return agent name
5. If no → Use `CHATBOT_TITLE` env var → Fallback to "AI Assistant"
6. Component receives agent name → Displays in UI

**Every step must work for the name to display correctly!**
