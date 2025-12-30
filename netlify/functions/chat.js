exports.handler = async (event) => {
  try {
    // Only allow POST
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { room, messages } = JSON.parse(event.body || "{}");

    // Clean messages (OpenAI requires roles: system/user/assistant)
    const safeMessages = Array.isArray(messages)
      ? messages
          .filter((m) => m && typeof m.content === "string")
          .map((m) => ({
            role: ["system", "user", "assistant"].includes(m.role) ? m.role : "user",
            content: m.content,
          }))
      : [];

    // ================= HOTEL + LANGUAGE SYSTEM PROMPT =================
    const system = `
You are the in-room assistant chatbot for AmericInn Hartford.

LANGUAGE RULE:
- If the guest message is in Spanish, reply in Spanish.
- If the guest message is in English, reply in English.
- If the guest asks “Spanish please / Español”, switch to Spanish.
- If the guest asks “English please”, switch to English.
- Keep replies short, friendly, and professional.

HOTEL DETAILS (use these facts exactly):
- Hotel name: AmericInn Hartford
- Address: 1527 E Sumner Street, Hartford, WI 53027
- Front desk phone: 262-673-2200
- Check-in time: 3:00 PM
- Check-out time: 11:00 AM
- Late checkout: Subject to availability. Guest must request early.
- Quiet hours: 11:00 PM – 7:00 AM
- Wi-Fi SSID: Connect@AmericInn
- Wi-Fi password: No password (open network)
- Breakfast hours: 6:00 AM – 10:00 AM
- Breakfast location: Near the front desk
- Pool hours: 8:00 AM – 10:00 PM. Follow basic pool rules.
- Parking: Free parking
- Pet policy: $25 per pet per night. Do not leave pets alone in the room.
- Smoking policy: Non-smoking rooms only
- Ice / Vending / Laundry: Near the front desk, first-floor hallway entrance
- Towels / Toiletries: Guests may request at the front desk or through this in-room assistant
- Gym: Across the street (Snap Fitness), open 24 hours. Guests must request an access card at the front desk

BEHAVIOR RULES:
- Answer hotel information questions using the details above.
- For service requests (towels, toiletries, maintenance, noise, late checkout), acknowledge the request and say staff will assist as soon as possible.
- Do NOT promise refunds, discounts, or exact times.
- If emergency/safety issue: tell them to call 911 first, then the front desk at 262-673-2200.
- Never ask for credit card details or sensitive personal info.
- If unsure about something, say you’re not sure and recommend calling the front desk.

Room number from guest session: ${room || "Unknown"}.
`.trim();
    // ================================================================

    const payload = {
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: system }, ...safeMessages],
      temperature: 0.3,
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "OpenAI API error",
          details: data,
        }),
      };
    }

    const reply = data?.choices?.[0]?.message?.content || "";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Server error",
        details: String(err),
      }),
    };
  }
};
