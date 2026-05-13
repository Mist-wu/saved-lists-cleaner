import { readFileSync } from "node:fs";

function loadEnv() {
  try {
    const text = readFileSync(".env", "utf8");
    for (const line of text.split("\n")) {
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const [key, ...rest] = line.split("=");
      process.env[key] ||= rest.join("=").trim();
    }
  } catch {
    // Environment variables may be provided by the host.
  }
}

loadEnv();

if (!process.env.DEEPSEEK_API_KEY) {
  console.error("Missing DEEPSEEK_API_KEY");
  process.exit(1);
}

const response = await fetch("https://api.deepseek.com/chat/completions", {
  method: "POST",
  headers: {
    authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    "content-type": "application/json",
  },
  body: JSON.stringify({
    model: "deepseek-chat",
    messages: [{ role: "user", content: "只回复 OK" }],
    temperature: 0,
    max_tokens: 16,
  }),
});

const data = await response.json();
console.log(
  JSON.stringify(
    {
      status: response.status,
      model: data.model,
      reply: data.choices?.[0]?.message?.content,
      error: data.error,
    },
    null,
    2,
  ),
);

process.exit(response.ok ? 0 : 1);
