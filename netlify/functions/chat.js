export default async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const { room, messages } = await req.json();

  const system = `
You are an in-room motel assistant chatbot.
Only help with motel requests: towels, toiletries, housekeeping, maintenance, Wi-Fi, late checkout, directions, policies.
Never ask for credit card details.
If emergency: tell guest to call 911 and the front desk.
Be short, friendly, and clear.
Room number is: ${room}.
`;

  const payload = {
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: system }, ...(messages || [])],
    temperature: 0.3,
  };

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await r.json();

  if (!r.ok) {
    return new Response(JSON.stringify({ error: data }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ reply: data.choices?.[0]?.message?.content || "" }), {
    headers: { "Content-Type": "application/json" },
  });
};
