# Automation Setup Guide for WaCRM

This guide explains how to set up and test the automation system in WaCRM.

## Prerequisites

Before automations can work, you need to configure the following environment variables in `.env.local`:

### Required Environment Variables

1. **SUPABASE_SERVICE_ROLE_KEY**
   - Get this from: Supabase Dashboard → Project Settings → API → Service Role Key
   - This key is used by the automation engine to access the database with admin privileges
   - **Keep this secret** - never expose it in client-side code

2. **ENCRYPTION_KEY** (already configured)
   - 64 hex characters (32 bytes) for AES-256-GCM encryption
   - Used to encrypt WhatsApp tokens in the database
   - Generated with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

3. **META_APP_SECRET**
   - Get this from: Meta for Developers → Your App → Settings → Basic → App Secret
   - Used to verify webhook signatures from Meta/WhatsApp

4. **AUTOMATION_CRON_SECRET** (already configured)
   - Any long random string
   - Used to protect the cron endpoint for wait steps
   - Generated with: `openssl rand -hex 32` or `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## Testing the Automation Cron Endpoint

The automation system uses a cron endpoint to process "Wait" steps. When an automation hits a wait step, it creates a pending execution that will be resumed later by the cron endpoint.

### Testing Locally

Run the test script:

**Windows:**
```bash
scripts/test-cron.bat
```

**Linux/Mac:**
```bash
bash scripts/test-cron.sh
```

Expected response (with valid SUPABASE_SERVICE_ROLE_KEY):
```json
{"processed": 0}
```

If you see `{"error":"Invalid API key"}`, you need to update your `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.

### Setting Up Cron in Production

For automations with "Wait" steps to work in production, you need to set up a cron job that periodically calls the cron endpoint.

**Option 1: Vercel Cron** (if deployed on Vercel)
Add to your `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/automations/cron",
      "schedule": "*/1 * * * *"
    }
  ]
}
```

**Option 2: External Cron Service**
Use a service like cron-job.org or UptimeRobot to call:
```
GET https://your-domain.com/api/automations/cron
Header: x-cron-secret: YOUR_AUTOMATION_CRON_SECRET
```

**Option 3: Self-hosted Cron**
Create a cron job on your server:
```bash
* * * * * curl -H "x-cron-secret: YOUR_AUTOMATION_CRON_SECRET" https://your-domain.com/api/automations/cron
```

## Automation Features

### Supported Triggers
- `new_contact_created` - When a new contact is added
- `first_inbound_message` - When a contact sends their first message
- `new_message_received` - When any message is received
- `keyword_match` - When a message contains specific keywords

### Supported Steps
- **send_message** - Send a text message
- **send_template** - Send a Meta-approved template message
- **add_tag** / **remove_tag** - Manage contact tags
- **assign_conversation** - Assign to an agent (supports round-robin)
- **update_contact_field** - Update contact name, email, or company
- **create_deal** - Create a deal in a pipeline
- **send_webhook** - Call an external API
- **close_conversation** - Close the conversation
- **condition** - Branch based on conditions (tag presence, contact field, message content, time of day)
- **wait** - Pause execution for a specified time

### Variable Interpolation
In text fields, you can use variables like:
- `{{message.text}}` - The message text that triggered the automation
- `{{vars.custom_var}}` - Custom variables accumulated during execution

## Troubleshooting

### Cron returns "cron not configured"
- `AUTOMATION_CRON_SECRET` is not set in `.env.local`

### Cron returns "Invalid API key"
- `SUPABASE_SERVICE_ROLE_KEY` is incorrect or not set
- Get the correct key from Supabase Dashboard → Project Settings → API

### Automations don't fire
- Check if automations are marked as "active" in the database
- Verify the trigger type matches the event
- Check automation logs in the database (`automation_logs` table)

### Wait steps don't resume
- Ensure the cron endpoint is being called regularly
- Check `automation_pending_executions` table for stuck executions
- Verify `AUTOMATION_CRON_SECRET` matches between `.env.local` and the cron request header

## Database Schema

The automation system uses these tables (created by migration `006_automations.sql`):
- `automations` - Main automation definitions
- `automation_steps` - Steps within each automation
- `automation_logs` - Execution history
- `automation_pending_executions` - Queue for wait steps

All tables have proper Row Level Security (RLS) policies to ensure users can only access their own data.