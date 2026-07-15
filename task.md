# Task Checklist - Android SMS Gateway

- [x] Create Database Migration `supabase/migrations/024_add_android_sms_gateway.sql` and run it locally
- [x] Create SMS Gateway settings APIs (`GET`, `POST` under `src/app/api/settings/sms-gateway/route.ts` and `POST` for testing under `src/app/api/settings/sms-gateway/test/route.ts`)
- [x] Create SMS Broadcast API dispatcher `/api/sms/broadcast` in `src/app/api/sms/broadcast/route.ts`
- [x] Create the frontend `SmsGatewayConfig` settings panel component
- [x] Add the new "SMS Gateway" tab in the main settings UI page
- [x] Modify `NewBroadcastPage` wizard to support WhatsApp vs SMS selection, SMS composing textarea, and variables
- [x] Update the `useBroadcastSending` hook to post to `/api/sms/broadcast` when using SMS channel
- [x] Update the Broadcast Campaigns list view to show the channel (WhatsApp/SMS) badge
- [x] Verify everything works by running tests or validating logic
