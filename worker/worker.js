// ============================================================
// EBG Ressourcenplaner API Worker - SharePoint Backend via ACS
// ============================================================

let cachedToken = null;
let tokenExpiry = 0;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function err(message, status = 500) {
  return json({ error: message }, status);
}

// --- ACS Token ---
async function getToken(env) {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) return cachedToken;

  const resp = await fetch(
    `https://accounts.accesscontrol.windows.net/${env.TENANT_ID}/tokens/OAuth/2`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: `${env.CLIENT_ID}@${env.TENANT_ID}`,
        client_secret: env.CLIENT_SECRET,
        resource: `00000003-0000-0ff1-ce00-000000000000/${env.SP_SITE}@${env.TENANT_ID}`,
      }).toString(),
    }
  );

  if (!resp.ok) throw new Error(`ACS Token failed: ${resp.status}`);
  const data = await resp.json();
  cachedToken = data.access_token;
  tokenExpiry = now + Math.max(300, data.expires_in - 300) * 1000;
  return cachedToken;
}

// --- SharePoint helpers ---
function spUrl(env) {
  return `https://${env.SP_SITE}${env.SP_SITE_PATH}/_api`;
}

async function spGet(env, path, token) {
  const resp = await fetch(`${spUrl(env)}/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json;odata=nometadata",
    },
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`SP GET ${path}: ${resp.status} ${t}`);
  }
  return resp.json();
}

async function spPost(env, path, token, body) {
  const resp = await fetch(`${spUrl(env)}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json;odata=nometadata",
      "Content-Type": "application/json;odata=nometadata",
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`SP POST ${path}: ${resp.status} ${t}`);
  }
  const text = await resp.text();
  return text ? JSON.parse(text) : {};
}

async function spMerge(env, path, token, body) {
  const resp = await fetch(`${spUrl(env)}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json;odata=nometadata",
      "Content-Type": "application/json;odata=nometadata",
      "IF-MATCH": "*",
      "X-HTTP-Method": "MERGE",
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`SP MERGE ${path}: ${resp.status} ${t}`);
  }
}

async function spDelete(env, path, token) {
  const resp = await fetch(`${spUrl(env)}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json;odata=nometadata",
      "IF-MATCH": "*",
      "X-HTTP-Method": "DELETE",
    },
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`SP DELETE ${path}: ${resp.status} ${t}`);
  }
}

// --- Pagination helper for large lists ---
async function spGetAll(env, listTitle, token, select, filter, orderBy) {
  let allItems = [];
  let url = `web/lists/getbytitle('${listTitle}')/items?$top=1000`;
  if (select) url += `&$select=${select}`;
  if (filter) url += `&$filter=${encodeURIComponent(filter)}`;
  if (orderBy) url += `&$orderby=${orderBy}`;

  while (url) {
    const data = await spGet(env, url, token);
    allItems = allItems.concat(data.value || []);
    // SharePoint pagination via __next
    url = data["odata.nextLink"]
      ? data["odata.nextLink"].split("/_api/")[1]
      : null;
  }
  return allItems;
}

// ========== ROUTE HANDLERS ==========

// --- Health ---
async function handleHealth(env) {
  try {
    const token = await getToken(env);
    const lists = await spGet(env, "web/lists?$select=Title&$top=50", token);
    return json({
      status: "ok",
      tokenOk: true,
      listsAvailable: (lists.value || []).map((l) => l.Title),
    });
  } catch (e) {
    return json({ status: "error", tokenOk: false, error: e.message }, 500);
  }
}

// --- Mitarbeiter ---
async function handleGetMitarbeiter(env) {
  const token = await getToken(env);
  const items = await spGetAll(
    env, "Mitarbeiter", token,
    "Id,Title,PersNr,Gruppe,Notizen,Urlaubstage,Aktiv",
    "Aktiv eq 1",
    "Gruppe,Title"
  );
  return json({ value: items });
}

async function handleCreateMitarbeiter(request, env) {
  const body = await request.json();
  const token = await getToken(env);
  const item = await spPost(env, "web/lists/getbytitle('Mitarbeiter')/items", token, {
    Title: body.Title,
    PersNr: body.PersNr,
    Gruppe: body.Gruppe,
    Notizen: body.Notizen || "",
    Urlaubstage: body.Urlaubstage || 0,
    Aktiv: true,
  });
  return json(item, 201);
}

async function handleUpdateMitarbeiter(id, request, env) {
  const body = await request.json();
  const token = await getToken(env);
  await spMerge(env, `web/lists/getbytitle('Mitarbeiter')/items(${id})`, token, body);
  return json({ success: true });
}

// --- Abwesenheiten ---
async function handleGetAbwesenheiten(url, env) {
  const von = url.searchParams.get("von");
  const bis = url.searchParams.get("bis");
  const token = await getToken(env);

  let filter = "";
  if (von && bis) {
    filter = `Datum ge datetime'${von}T00:00:00' and Datum le datetime'${bis}T23:59:59'`;
  } else if (von) {
    filter = `Datum ge datetime'${von}T00:00:00'`;
  }

  const items = await spGetAll(
    env, "Abwesenheiten", token,
    "Id,Title,PersNr,Datum,Typ",
    filter,
    "PersNr,Datum"
  );
  // Normalize Datum to YYYY-MM-DD
  items.forEach((i) => {
    if (i.Datum) i.Datum = i.Datum.slice(0, 10);
  });
  return json({ value: items });
}

async function handleCreateAbwesenheit(request, env) {
  const body = await request.json();
  const token = await getToken(env);

  // Support batch: array of items
  if (Array.isArray(body)) {
    const results = [];
    for (const item of body) {
      const title = `${item.PersNr}-${item.Datum}`;
      const created = await spPost(env, "web/lists/getbytitle('Abwesenheiten')/items", token, {
        Title: title,
        PersNr: item.PersNr,
        Datum: item.Datum,
        Typ: item.Typ,
      });
      results.push(created);
    }
    return json({ value: results }, 201);
  }

  const title = `${body.PersNr}-${body.Datum}`;
  // Check if exists, update type if so
  const existing = await spGetAll(
    env, "Abwesenheiten", token,
    "Id,Title",
    `Title eq '${title}'`,
    null
  );
  if (existing.length > 0) {
    await spMerge(env, `web/lists/getbytitle('Abwesenheiten')/items(${existing[0].Id})`, token, {
      Typ: body.Typ,
    });
    return json({ Id: existing[0].Id, updated: true });
  }

  const item = await spPost(env, "web/lists/getbytitle('Abwesenheiten')/items", token, {
    Title: title,
    PersNr: body.PersNr,
    Datum: body.Datum,
    Typ: body.Typ,
  });
  return json(item, 201);
}

async function handleDeleteAbwesenheit(id, env) {
  const token = await getToken(env);
  await spDelete(env, `web/lists/getbytitle('Abwesenheiten')/items(${id})`, token);
  return json({ success: true });
}

// --- Kostenstellen ---
async function handleGetKostenstellen(env) {
  const token = await getToken(env);
  const items = await spGetAll(
    env, "Kostenstellen", token,
    "Id,Title,Aktiv,Bauleiter0,Auftraggeber,StartDatum,EndeDatum",
    "Aktiv eq 1",
    "Title"
  );
  items.forEach((i) => {
    if (i.StartDatum) i.StartDatum = i.StartDatum.slice(0, 10);
    if (i.EndeDatum) i.EndeDatum = i.EndeDatum.slice(0, 10);
    // Normalize field names for frontend
    i.Bauleiter = i.Bauleiter0 || "";
    delete i.Bauleiter0;
  });
  return json({ value: items });
}

async function handleUpdateKostenstelle(id, request, env) {
  const body = await request.json();
  const token = await getToken(env);
  // Map Bauleiter → Bauleiter0 (Text field, not User field)
  const spBody = { ...body };
  if ("Bauleiter" in spBody) {
    spBody.Bauleiter0 = spBody.Bauleiter;
    delete spBody.Bauleiter;
  }
  await spMerge(env, `web/lists/getbytitle('Kostenstellen')/items(${id})`, token, spBody);
  return json({ success: true });
}

// --- Kolonnen ---
async function handleGetKolonnen(env) {
  const token = await getToken(env);
  const kolonnen = await spGetAll(env, "Kolonnen", token, "Id,Title,Polier0", null, "Title");
  kolonnen.forEach((k) => { k.Polier = k.Polier0 || ""; delete k.Polier0; });
  const mitglieder = await spGetAll(
    env, "KolonneMitglieder", token,
    "Id,Title,KolonneId,PersNr",
    null, "KolonneId"
  );

  // Denormalize: attach members to each kolonne
  const memberMap = {};
  mitglieder.forEach((m) => {
    const kid = m.KolonneId;
    if (!memberMap[kid]) memberMap[kid] = [];
    memberMap[kid].push(m);
  });
  kolonnen.forEach((k) => {
    k.Mitglieder = memberMap[k.Id] || [];
  });

  return json({ value: kolonnen });
}

async function handleCreateKolonne(request, env) {
  const body = await request.json();
  const token = await getToken(env);
  const item = await spPost(env, "web/lists/getbytitle('Kolonnen')/items", token, {
    Title: body.Title,
    Polier0: body.Polier || "",
  });
  return json(item, 201);
}

async function handleUpdateKolonne(id, request, env) {
  const body = await request.json();
  const token = await getToken(env);
  const spBody = { ...body };
  if ("Polier" in spBody) {
    spBody.Polier0 = spBody.Polier;
    delete spBody.Polier;
  }
  await spMerge(env, `web/lists/getbytitle('Kolonnen')/items(${id})`, token, spBody);
  return json({ success: true });
}

async function handleDeleteKolonne(id, env) {
  const token = await getToken(env);
  // Delete all members first
  const members = await spGetAll(
    env, "KolonneMitglieder", token, "Id",
    `KolonneId eq ${id}`, null
  );
  for (const m of members) {
    await spDelete(env, `web/lists/getbytitle('KolonneMitglieder')/items(${m.Id})`, token);
  }
  // Delete kolonne
  await spDelete(env, `web/lists/getbytitle('Kolonnen')/items(${id})`, token);
  return json({ success: true });
}

async function handleAddMitglied(kolonneId, request, env) {
  const body = await request.json();
  const token = await getToken(env);
  const title = `${kolonneId}-${body.PersNr}`;
  const item = await spPost(env, "web/lists/getbytitle('KolonneMitglieder')/items", token, {
    Title: title,
    KolonneId: kolonneId,
    PersNr: body.PersNr,
  });
  return json(item, 201);
}

async function handleRemoveMitglied(kolonneId, persNr, env) {
  const token = await getToken(env);
  const items = await spGetAll(
    env, "KolonneMitglieder", token, "Id",
    `KolonneId eq ${kolonneId} and PersNr eq '${persNr}'`,
    null
  );
  for (const m of items) {
    await spDelete(env, `web/lists/getbytitle('KolonneMitglieder')/items(${m.Id})`, token);
  }
  return json({ success: true });
}

// --- Zuweisungen ---
async function handleGetZuweisungen(env) {
  const token = await getToken(env);
  const items = await spGetAll(
    env, "Zuweisungen", token,
    "Id,Title,KolonneId,KostenstelleId,Von,Bis",
    null, "Von"
  );
  items.forEach((i) => {
    if (i.Von) i.Von = i.Von.slice(0, 10);
    if (i.Bis) i.Bis = i.Bis.slice(0, 10);
  });
  return json({ value: items });
}

async function handleCreateZuweisung(request, env) {
  const body = await request.json();
  const token = await getToken(env);
  const item = await spPost(env, "web/lists/getbytitle('Zuweisungen')/items", token, {
    Title: body.Title || `${body.KolonneId}-${body.KostenstelleId}`,
    KolonneId: body.KolonneId,
    KostenstelleId: body.KostenstelleId,
    Von: body.Von,
    Bis: body.Bis,
  });
  return json(item, 201);
}

async function handleUpdateZuweisung(id, request, env) {
  const body = await request.json();
  const token = await getToken(env);
  await spMerge(env, `web/lists/getbytitle('Zuweisungen')/items(${id})`, token, body);
  return json({ success: true });
}

async function handleDeleteZuweisung(id, env) {
  const token = await getToken(env);
  await spDelete(env, `web/lists/getbytitle('Zuweisungen')/items(${id})`, token);
  return json({ success: true });
}

// --- Gantt ---
async function handleGetGantt(url, env) {
  const kstNr = url.searchParams.get("kstNr");
  const token = await getToken(env);

  let filter = null;
  if (kstNr) filter = `KostenstelleNr eq '${kstNr.replace(/'/g, "''")}'`;

  const items = await spGetAll(
    env, "Gantt chart", token,
    "Id,Title,KostenstelleNr,Startdatum,Enddatum,Fortschritt",
    filter, "Startdatum"
  );
  items.forEach((i) => {
    // Normalize to frontend field names
    i.StartDatum = i.Startdatum ? i.Startdatum.slice(0, 10) : "";
    i.EndeDatum = i.Enddatum ? i.Enddatum.slice(0, 10) : "";
    delete i.Startdatum;
    delete i.Enddatum;
  });
  return json({ value: items });
}

async function handleCreateGantt(request, env) {
  const body = await request.json();
  const token = await getToken(env);
  const item = await spPost(env, "web/lists/getbytitle('Gantt chart')/items", token, {
    Title: body.Title,
    KostenstelleNr: body.KostenstelleNr,
    Startdatum: body.StartDatum,
    Enddatum: body.EndeDatum,
    Fortschritt: body.Fortschritt || 0,
  });
  return json(item, 201);
}

async function handleUpdateGantt(id, request, env) {
  const body = await request.json();
  const token = await getToken(env);
  const spBody = { ...body };
  if ("StartDatum" in spBody) { spBody.Startdatum = spBody.StartDatum; delete spBody.StartDatum; }
  if ("EndeDatum" in spBody) { spBody.Enddatum = spBody.EndeDatum; delete spBody.EndeDatum; }
  await spMerge(env, `web/lists/getbytitle('Gantt chart')/items(${id})`, token, spBody);
  return json({ success: true });
}

async function handleDeleteGantt(id, env) {
  const token = await getToken(env);
  await spDelete(env, `web/lists/getbytitle('Gantt chart')/items(${id})`, token);
  return json({ success: true });
}

// ========== ROUTER ==========
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    try {
      // Health
      if (path === "/api/health" && method === "GET") {
        return await handleHealth(env);
      }

      // Mitarbeiter
      if (path === "/api/mitarbeiter" && method === "GET") {
        return await handleGetMitarbeiter(env);
      }
      if (path === "/api/mitarbeiter" && method === "POST") {
        return await handleCreateMitarbeiter(request, env);
      }
      const maMatch = path.match(/^\/api\/mitarbeiter\/(\d+)$/);
      if (maMatch && method === "PUT") {
        return await handleUpdateMitarbeiter(parseInt(maMatch[1]), request, env);
      }

      // Abwesenheiten
      if (path === "/api/abwesenheiten" && method === "GET") {
        return await handleGetAbwesenheiten(url, env);
      }
      if (path === "/api/abwesenheiten" && method === "POST") {
        return await handleCreateAbwesenheit(request, env);
      }
      const abMatch = path.match(/^\/api\/abwesenheiten\/(\d+)$/);
      if (abMatch && method === "DELETE") {
        return await handleDeleteAbwesenheit(parseInt(abMatch[1]), env);
      }

      // Kostenstellen
      if (path === "/api/kostenstellen" && method === "GET") {
        return await handleGetKostenstellen(env);
      }
      const kstMatch = path.match(/^\/api\/kostenstellen\/(\d+)$/);
      if (kstMatch && method === "PUT") {
        return await handleUpdateKostenstelle(parseInt(kstMatch[1]), request, env);
      }

      // Kolonnen
      if (path === "/api/kolonnen" && method === "GET") {
        return await handleGetKolonnen(env);
      }
      if (path === "/api/kolonnen" && method === "POST") {
        return await handleCreateKolonne(request, env);
      }
      const kolMatch = path.match(/^\/api\/kolonnen\/(\d+)$/);
      if (kolMatch && method === "PUT") {
        return await handleUpdateKolonne(parseInt(kolMatch[1]), request, env);
      }
      if (kolMatch && method === "DELETE") {
        return await handleDeleteKolonne(parseInt(kolMatch[1]), env);
      }

      // Kolonne Mitglieder
      const kolMitMatch = path.match(/^\/api\/kolonnen\/(\d+)\/mitglieder$/);
      if (kolMitMatch && method === "POST") {
        return await handleAddMitglied(parseInt(kolMitMatch[1]), request, env);
      }
      const kolMitDelMatch = path.match(/^\/api\/kolonnen\/(\d+)\/mitglieder\/(.+)$/);
      if (kolMitDelMatch && method === "DELETE") {
        return await handleRemoveMitglied(
          parseInt(kolMitDelMatch[1]),
          decodeURIComponent(kolMitDelMatch[2]),
          env
        );
      }

      // Zuweisungen
      if (path === "/api/zuweisungen" && method === "GET") {
        return await handleGetZuweisungen(env);
      }
      if (path === "/api/zuweisungen" && method === "POST") {
        return await handleCreateZuweisung(request, env);
      }
      const zuwMatch = path.match(/^\/api\/zuweisungen\/(\d+)$/);
      if (zuwMatch && method === "PUT") {
        return await handleUpdateZuweisung(parseInt(zuwMatch[1]), request, env);
      }
      if (zuwMatch && method === "DELETE") {
        return await handleDeleteZuweisung(parseInt(zuwMatch[1]), env);
      }

      // Gantt
      if (path === "/api/gantt" && method === "GET") {
        return await handleGetGantt(url, env);
      }
      if (path === "/api/gantt" && method === "POST") {
        return await handleCreateGantt(request, env);
      }
      const ganttMatch = path.match(/^\/api\/gantt\/(\d+)$/);
      if (ganttMatch && method === "PUT") {
        return await handleUpdateGantt(parseInt(ganttMatch[1]), request, env);
      }
      if (ganttMatch && method === "DELETE") {
        return await handleDeleteGantt(parseInt(ganttMatch[1]), env);
      }

      return err("Not Found", 404);
    } catch (e) {
      return err(e.message, 500);
    }
  },
};
