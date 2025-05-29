// app/api/notify-chat/route.ts
export async function POST(request) {
  const body = await request.json();

  const webhookUrl =
    'https://chat.googleapis.com/v1/spaces/AAAACgmdPOM/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=BUIfzSSxRkOYgY5qVs9_TqKGHuHJoKoo3mN4Rnm-90E'; // Use env var for security

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: body.message || '🚨 Notification from Next.js app!',
    }),
  });

  if (!res.ok) {
    return new Response('Failed to send message to Google Chat', {
      status: 500,
    });
  }

  return Response.json({ success: true });
}
