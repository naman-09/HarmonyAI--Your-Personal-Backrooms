import { NextRequest, NextResponse } from 'next/server';
import { triggerLevelAlert, getUserAlertSettings } from '@/lib/crisis-alert';

// POST /api/crisis-alert/test — send a test SMS to the trusted contact
export async function POST(req: NextRequest) {
  const userId = parseInt(req.headers.get('x-user-id') || '0', 10);

  const settings = await getUserAlertSettings(userId);

  if (!settings.trustedContactPhone) {
    return NextResponse.json(
      { error: 'No trusted contact phone number saved. Add one in Settings first.' },
      { status: 400 }
    );
  }

  // Use a fake sessionId for the test alert — won't update any real session
  const result = await triggerLevelAlert(
    2,
    'test-alert-' + userId,
    userId,
    {
      ...settings,
      trustedContactName: settings.trustedContactName ?? 'your contact',
      userName: settings.userName ?? 'Harmony user',
    },
    undefined // no location for test
  );

  return NextResponse.json({
    ok:        result.smsStatus === 'sent',
    smsStatus: result.smsStatus,
    message:   result.smsStatus === 'sent'
      ? `Test alert sent to ${settings.trustedContactPhone} 💙`
      : result.smsStatus === 'no_api_key'
      ? 'No Fast2SMS API key configured. Add FAST2SMS_API_KEY to .env.local'
      : 'SMS failed — check your Fast2SMS account and API key',
  });
}
