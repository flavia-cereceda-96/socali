// Parses a natural-language plan description into structured event fields.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { text, today, weekday, friends = [], current = {} } = await req.json();
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "Missing LOVABLE_API_KEY" }, 500);
    if (typeof text !== "string" || !text.trim() || text.length > 1000) return json({ error: "Invalid text" }, 400);

    const friendList = (friends as { id: string; username: string }[])
      .slice(0, 300)
      .map((f) => `${f.id}: ${f.username}`)
      .join("\n");

    const system = `You extract event details for a social planning app. Today is ${today} (${weekday}).
Resolve relative dates ("tomorrow", "next Friday", "this weekend" = upcoming Saturday) to YYYY-MM-DD. Times as 24h HH:MM.
Only set fields the user actually stated or clearly implied; leave others null. Merge with already-known fields: ${JSON.stringify(current)}.
If the user says no time / all day / whenever, set no_time true.
Title: short, catchy event name deduced from context (e.g. "Dinner with Maya" -> "Dinner"). Pick one fitting emoji.
Match mentioned people ONLY against this friends list (id: username), fuzzy on names/nicknames:
${friendList || "(no friends)"}
Put names you couldn't match in unmatched_names.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: text },
        ],
        tools: [{
          type: "function",
          function: {
            name: "set_event",
            description: "Return extracted event fields",
            parameters: {
              type: "object",
              properties: {
                title: { type: ["string", "null"] },
                emoji: { type: ["string", "null"] },
                date: { type: ["string", "null"], description: "YYYY-MM-DD" },
                start_time: { type: ["string", "null"], description: "HH:MM" },
                end_time: { type: ["string", "null"], description: "HH:MM" },
                no_time: { type: "boolean" },
                friend_ids: { type: "array", items: { type: "string" } },
                unmatched_names: { type: "array", items: { type: "string" } },
                location: { type: ["string", "null"] },
              },
              required: ["title", "emoji", "date", "start_time", "end_time", "no_time", "friend_ids", "unmatched_names", "location"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "set_event" } },
      }),
    });

    if (res.status === 429) return json({ error: "Too many requests, try again in a moment" }, 429);
    if (res.status === 402) return json({ error: "AI credits exhausted" }, 402);
    if (!res.ok) return json({ error: "AI error", details: await res.text() }, 500);

    const data = await res.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : {};
    const validIds = new Set((friends as { id: string }[]).map((f) => f.id));
    parsed.friend_ids = (parsed.friend_ids || []).filter((id: string) => validIds.has(id));
    return json(parsed);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
