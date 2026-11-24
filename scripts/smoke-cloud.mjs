const URL = process.env.SUPABASE_URL || "https://vwvmwpdxjpdhdjogdfah.supabase.co";
const KEY =
  process.env.SUPABASE_ANON_KEY ||
  "sb_publishable_cml80hW-PEwAwXVPZR0LqQ_CU-wPoDr";

async function sync(body) {
  const res = await fetch(`${URL}/functions/v1/sync-api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function count(table) {
  const res = await fetch(
    `${URL}/rest/v1/${table}?select=id&deleted_at=is.null&limit=1`,
    {
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        Prefer: "count=exact",
      },
    },
  );
  return res.headers.get("content-range");
}

const login = await sync({
  action: "sync-pull",
  email: "admin@laverie.com",
  password: "admin123",
});
console.log("login", login.status, login.data.error || "ok", "emps", login.data.entities?.employees?.length);

const platform = await sync({
  action: "platform-login",
  platform_email: "superadmin@laverie.com",
  platform_password: "admin123",
});
console.log("platform-login", platform.status, platform.data.error || "ok");

console.log("employees", await count("employees"));
console.log("orders", await count("orders"));
console.log("customers", await count("customers"));

const sites = await fetch(`${URL}/rest/v1/lav_site?select=id,nom,is_active`, {
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
}).then((r) => r.json());
console.log("sites", sites);
