// app/api/notify-chat/route.ts
export async function POST(request) {
  const body = await request.json();

  const webhookUrl =
    'https://chat.googleapis.com/v1/spaces/AAAAcQRLV5U/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=3mTBXjbmJyWQCwHF-1vqSdzdrOxz42ZCLFrwCV_uwys'; // Use env var for security

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: body.message || '🚨 Notification from app!',
    }),
  });

  if (!res.ok) {
    return new Response('Failed to send message to Google Chat', {
      status: 500,
    });
  }

  return Response.json({ success: true });
}
