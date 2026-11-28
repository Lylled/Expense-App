// Supabase Edge Function: parse-receipt
//
// Sends a receipt photo to Gemini's vision API and returns structured
// store/date/items/total data. Replaces on-device OCR + heuristic row
// reconstruction (src/lib/parse-receipt.ts) for the receipt-scan screen:
// a vision model reads the whole receipt holistically instead of
// reassembling rows from OCR bounding boxes, which was unreliable
// whenever a row's name and price landed in slightly different
// positions (see issue discussion - it mixed up adjacent items' prices).
//
// Deploy via the Supabase Dashboard (Edge Functions -> Deploy a new
// function, paste this file) or `supabase functions deploy parse-receipt`.
// Requires a GEMINI_API_KEY secret (Edge Functions -> Secrets), from
// https://aistudio.google.com/apikey. Supabase verifies the caller's
// login before this code runs, so only signed-in users can invoke it.

const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-flash-lite-latest';

const PROMPT = `Olet kuitintunnistusavustaja. Saat kuvan suomalaisesta kauppakuitista. Lue kuva tarkasti ja poimi siitä tiedot alla kuvatun skeeman mukaisesti.

Säännöt:
- "items" sisältää VAIN oikeasti ostetut tuotteet hintoineen, EI seuraavia: ALV-erittelyt, yhteenveto-/summarivit ("YHTEENSÄ", "SUMMA"), maksutapahtuman tiedot (kortti, viite, tapahtumanumero), kanta-asiakastiedot, pyöristysrivit, palautusehdot tai muu kuittiin painettu lisäteksti.
- Jos tuotteen alla on oma rivi, jossa lukee paino ja yksikköhinta (esim. "0,404 KG" ja "11,90 €/KG"), ÄLÄ lisää sitä omaksi riviksi - se kuuluu yllä olevaan tuotteeseen, jonka hinta on jo oikea.
- Jos tuotteen alla on oma rivi "2 KPL" ja "2,99 €/KPL" -tyyliin, sama koskee sitä: älä lisää omaksi riviksi.
- Jos kuitilla on erillinen alennusrivi (esim. "PLUSSAETU" tai muu alennus), vähennä sen summa edellisen tuotteen hinnasta äläkä lisää alennusta omaksi riviksi.
- "date" on muodossa pp.kk.vvvv.
- Jos et pysty lukemaan jotain kohtaa luotettavasti, tee paras arvauksesi äläkä jätä riviä pois - käyttäjä voi korjata virheet käsin jälkeenpäin.`;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    storeName: { type: 'STRING', nullable: true },
    date: { type: 'STRING', nullable: true },
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          price: { type: 'NUMBER' },
        },
        required: ['name', 'price'],
      },
    },
    total: { type: 'NUMBER', nullable: true },
  },
  required: ['items'],
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    return jsonResponse({ error: 'GEMINI_API_KEY ei ole asetettu palvelimelle.' }, 500);
  }

  let body: { imageBase64?: string; mimeType?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Pyynnön JSON-sisältö on virheellinen.' }, 400);
  }

  if (!body.imageBase64) {
    return jsonResponse({ error: 'imageBase64 puuttuu pyynnöstä.' }, 400);
  }

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROMPT },
              {
                inline_data: {
                  mime_type: body.mimeType ?? 'image/jpeg',
                  data: body.imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    }
  );

  if (!geminiResponse.ok) {
    const errorText = await geminiResponse.text();
    return jsonResponse({ error: `Gemini-API palautti virheen: ${errorText}` }, 502);
  }

  const geminiResult = await geminiResponse.json();
  const text = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return jsonResponse({ error: 'Gemini ei palauttanut vastausta.' }, 502);
  }

  try {
    const parsed = JSON.parse(text);
    return jsonResponse(parsed, 200);
  } catch {
    return jsonResponse({ error: 'Gemini ei palauttanut kelvollista JSONia.' }, 502);
  }
});
