# Plan: "Discover company offices" — wyszukiwanie nieznanej firmy + scraping na żywo

## Context

Dziś GlobalOfficeFinder to statyczne SPA (Vite + React + Leaflet). Lista firm i biur to JSON w `/data/companies.json` i `/data/offices.json`, a obecne skrypty scrapera (`scripts/scraper/run-scraper.mjs`, `scripts/enrich-company-photos.mjs`) są CLI mutującym te pliki w build-time. Jeśli user wpisze w wyszukiwarce firmę, której nie ma w bazie, dostaje tylko empty state „No companies match" — bez żadnej akcji.

Cel: gdy lokalny filtr zwraca zero wyników, pokazać popup z propozycją wyszukania biur tej firmy w sieci. Po zgodzie usera — odpalić runtime'owy "discovery": Wikidata SPARQL + Wikimedia Commons + LLM (przez OpenRouter, klucz API ukryty w backendzie) — i wyrenderować izolowany pełnoekranowy widok mapy `/discover/:slug` z markerami biur i tile'em z opisem + licencjonowanym zdjęciem. Wyniki istnieją tylko w sesji; przycisk „Zakończ wyszukiwanie" + confirm modal → powrót do `/` i czyszczenie state.

## Decyzje architektoniczne (potwierdzone)

- **Backend**: lekki Node — Vercel Serverless Functions (`/api/discover.ts`). Lokalnie odpalane przez `vercel dev`. Klucz `OPENROUTER_API_KEY` żyje tylko po stronie serwera.
- **LLM provider**: OpenRouter (OpenAI-kompatybilny). Używamy oficjalnego `openai` SDK z `baseURL = https://openrouter.ai/api/v1`. Model wybierany przez env (`OPENROUTER_MODEL`, default np. `anthropic/claude-3.5-sonnet` lub `openai/gpt-4o-mini`). Łatwo wymienić w przyszłości.
- **Persystencja**: zero — wyniki żyją w React state na `/discover/:slug`. Po wyjściu znikają.
- **Widok**: nowa trasa `/discover/:slug` z własnym layoutem (bez globalnego nagłówka/filtrów), tylko mapa + tile + przycisk „Zakończ".

## Architektura — flow

1. **HomePage** — gdy `filteredCompanies.length === 0` i `searchQuery.trim().length >= 2`, pokaż modal `NotFoundDiscoverModal` z pytaniem „Firma «X» nie znajduje się w bazie. Wyszukać jej biura w sieci?". Akcja „Tak" → `navigate('/discover/' + slug(query))` z `state: { rawQuery }`.
2. **DiscoverPage** (nowa trasa) — przy mountcie wywołuje `POST /api/discover` z `{ companyName }`. Stan: `idle | loading | success | error`. Loading pokazuje progres (etapy: „Szukam firmy w Wikidacie..." → „Pobieram lokalizacje biur..." → „Weryfikuję dane z AI..." → „Ładuję zdjęcia...").
3. **Backend `/api/discover`**:
   - **Krok A**: Wikidata `wbsearchentities` po `companyName`. Pobierz top N kandydatów z opisem.
   - **Krok B**: LLM wybiera właściwą encję (pasuje opis → biznesowa firma, nie osoba/film/itp.). Output: `wikidataId`.
   - **Krok C**: SPARQL — dla wybranej encji wyciągnij: P159 (HQ), P355 (subsidiaries) z ich P159, P276 (location), P18 (image). Każda lokalizacja: P625 (geo coords), P17 (country), label miasta.
   - **Krok D**: LLM bierze surową listę lokalizacji + nazwę firmy, zwraca uporządkowaną tablicę `offices` w schema'cie zgodnym z `src/types/index.ts` (`Office` — bez `id`/`companyId`, te generujemy po stronie klienta jako `temp-<uuid>`). Deduplikacja, klasyfikacja `officeType` (`hq | regional | branch`).
   - **Krok E**: Dla P18 obrazu — Commons API (logika z `scripts/enrich-company-photos.mjs`): pobierz metadata, odfiltruj nie-permissive licencje (CC0/PD/CC-BY/CC-BY-SA), zwróć `CompanyPhoto`.
   - Response: `{ company: { name, description, website? }, offices: Office[], photo?: CompanyPhoto }`.
4. **DiscoverPage** renderuje `<MapView>` (istniejący) z tymczasowymi biurami + tile (kopia struktury z `HomePage.tsx` linie 307–365, ale jako oddzielny komponent `DiscoverTile`). Stopka z przyciskiem „Zakończ wyszukiwanie" → otwiera `EndSearchModal` z confirm → `navigate('/')` (state automatycznie znika z unmountem).

## Nowe pliki

- `api/discover.ts` — Vercel serverless function. Body: `{ companyName: string }`. Używa `openai` SDK + Wikidata/Wikimedia fetch. Walidacja inputu (zod opcjonalnie, ale wystarczy ręcznie — boundary).
- `api/_lib/wikidata.ts` — shared: `searchEntities()`, `fetchEntityOffices(qid)`. Reuse logiki z `scripts/scraper/run-scraper.mjs` — najpierw refaktor: wyciągnąć Wikidata helpers do `scripts/lib/wikidata.mjs`, importowalne z obu stron.
- `api/_lib/wikimedia.ts` — j.w. dla Commons; refaktor z `scripts/enrich-company-photos.mjs` → `scripts/lib/wikimedia.mjs`.
- `api/_lib/openrouter.ts` — singleton klienta OpenRouter + helpers prompt + parse JSON odpowiedzi.
- `src/pages/DiscoverPage.tsx` — nowa pełnoekranowa trasa.
- `src/components/NotFoundDiscoverModal.tsx` — popup z propozycją wyszukania.
- `src/components/EndSearchModal.tsx` — confirm modal przy „Zakończ".
- `src/components/DiscoverTile.tsx` — wydzielony tile (mapcard) z mini Photo + opisem.
- `src/lib/slug.ts` — `slugify(name: string): string` (lowercase, kebab, normalizacja diakrytyków).
- `src/lib/discoverClient.ts` — `fetchDiscovery(companyName): Promise<DiscoveryResult>`; typy `DiscoveryResult`, `DiscoveryStage`.
- `vercel.json` — minimalna konfiguracja (rewrites/SPA fallback dla React Router + runtime dla `/api/*`).
- `.env.example` — `OPENROUTER_API_KEY=`, `OPENROUTER_MODEL=anthropic/claude-3.5-sonnet`, `OPENROUTER_REFERRER=https://globalofficefinder.local`.

## Pliki do modyfikacji

- `src/App.tsx` — dodać route `/discover/:slug` poza wspólnym layoutem (jeśli layout jest globalny, wprowadzić layout-route pattern; jeśli nie, po prostu render `<DiscoverPage />` bez globalnego nagłówka).
- `src/pages/HomePage.tsx` — w `matchOffices`/empty-state path (linie 79–101, 284–293): kiedy `searchQuery` ma sens, a wynik pusty → pokaż `NotFoundDiscoverModal`. Modal powinien pojawiać się raz (kontrolowany przez `searchQuery` + flagę „dismissed"), żeby nie spamował przy każdym keystroke. Debounce 600–800 ms.
- `package.json` — deps: `openai` (runtime). Vercel runtime ma Node >=18 więc native `fetch` wystarczy. Dev: `vercel` (CLI) do `vercel dev`. Skrypty: `dev:api` jako alias.
- `scripts/scraper/run-scraper.mjs`, `scripts/enrich-company-photos.mjs` — refaktor: wyciągnąć Wikidata/Wikimedia logikę do `scripts/lib/*.mjs`. Skrypty CLI dalej działają jak dziś.
- `e2e/smoke.spec.ts` — dodać test: wyszukaj „NoSuchCompanyXYZ" → asercja, że modal się pokazuje. Mock `/api/discover` w teście (np. Playwright `page.route`) żeby nie wołać OpenRoutera.

## Reused / nie zmieniamy

- `src/components/MapView.tsx` — bez zmian, akceptuje listę offices z props. Dla `DiscoverPage` po prostu przekazujemy `offices` z odpowiedzi `/api/discover`.
- `src/components/Photo.tsx` — bez zmian, renderuje `CompanyPhoto` z credit + licencją.
- `src/types/index.ts` — bez zmian (response z API używa istniejących typów `Office`, `Company`, `CompanyPhoto`).
- Logika filtrowania licencji w `enrich-company-photos.mjs` — przejdzie do `scripts/lib/wikimedia.mjs` 1:1.

## LLM prompt (skrótowo)

Dwa wywołania per discovery:

1. **Entity selection** — system: „You match a free-text company name to one Wikidata entity. Return JSON `{wikidataId, confidence}` or `{wikidataId: null}`." User: nazwa + lista kandydatów (Q-id, label, opis).
2. **Offices structuring** — system: „You return a JSON array of offices matching this TypeScript type: `{country, countryCode, region, city, address?, officeType: 'hq'|'regional'|'branch', latitude?, longitude?}`. Deduplicate. Skip locations without at least city+country." User: nazwa firmy + surowe JSON-y lokalizacji z SPARQL.

Oba wywołania używają `response_format: { type: 'json_object' }`. Walidacja runtime po stronie serwera — jeśli LLM zwróci śmieć, response API to `{ offices: [], error: 'LLM_INVALID' }`.

## Bezpieczeństwo / koszty

- Klucz OpenRouter tylko w env serwera, nigdy w bundle.
- Rate limit per IP w `/api/discover` (proste in-memory; Vercel restartuje funkcje, więc to best-effort — wystarczające na start).
- Walidacja długości `companyName` (2–80 znaków, sanitize whitespace).
- Cache w serwerze (Map z TTL 1h) na `companyName.toLowerCase()` — chroni przed powtórnym wołaniem LLM jak user zrobi refresh.

## UX szczegóły

- Modal „nie znaleziono" pojawia się dopiero po debounce 600 ms, raz na zapytanie (zapamiętaj ostatnie pokazane query).
- Loading na `/discover` z mockowanymi etapami (timer + animacja); progres rzeczywisty można dorobić później SSE.
- `EndSearchModal` confirm: „Wynik wyszukiwania zostanie usunięty. Kontynuować?" → „Tak, zakończ" / „Anuluj".
- Tile pokazuje banner „Dane tymczasowe — odkryte na żywo, niezweryfikowane ręcznie" + licencję zdjęcia.

## Plan implementacji (kolejność)

1. Refaktor: wydziel Wikidata + Wikimedia helpers do `scripts/lib/*.mjs`, zweryfikuj że `npm run scrape:*` dalej działa.
2. Stwórz `api/_lib/openrouter.ts` + prosty endpoint `api/discover.ts` zwracający dummy data → przetestuj `vercel dev` + `curl`.
3. Podepnij Wikidata + Commons + OpenRouter w `api/discover.ts` — zwracaj realne dane dla 2–3 ręcznie wybranych firm.
4. Frontend: `slugify`, `discoverClient`, `DiscoverPage` z `MapView` + `DiscoverTile`. Dodaj route w `App.tsx` bez header.
5. `NotFoundDiscoverModal` w `HomePage.tsx` + debounce + nawigacja.
6. `EndSearchModal` + cleanup state.
7. Testy: unit (slugify, modal show/hide), e2e (Playwright z `page.route` mockiem `/api/discover`).
8. `.env.example`, `vercel.json`, README update (jak odpalić lokalnie: `vercel dev`).

## Verification

- **Lokalnie**: `vercel dev` (port 3000). Otwórz `/`, wpisz w search „NoSuchCompanyXYZ" → modal po ~700 ms → klik „Tak" → loading na `/discover/nosuchcompanyxyz` → po ~5–20 s wynik (przy realnej firmie typu „Stripe", „Klarna") lub error state (przy randomowym stringu). Mapa renderuje markery, klik na pin pokazuje tile, klik „Zakończ" → confirm → powrót do `/` z czystym state.
- **API smoke**: `curl -X POST localhost:3000/api/discover -d '{"companyName":"Stripe"}' -H 'content-type: application/json'` → JSON z ≥1 office.
- **Testy**: `npm test` (Vitest), `npm run test:e2e` (Playwright z mockiem `/api/discover`).
- **Build**: `npm run build && vercel build` — żaden serwerowy import nie wycieka do frontu (check bundle pod `OPENROUTER_API_KEY`).

## Otwarte kwestie (do dopowiedzenia później, nie blokują startu)

- Czy `/discover/:slug` powinno być indexable przez SEO (`robots: noindex`?) — domyślnie noindex, bo dane są tymczasowe.
- Czy zostawić ślad „użytkownicy chcieli X" — np. log do pliku/Sentry, do późniejszej priorytetyzacji ręcznego dodawania firm. Na razie pomijam.
- Limit liczby biur na firmę (np. max 200) — żeby LLM nie zwracał gigantycznego JSON-a. Default 100, configurable.
