# EBG Ressourcenplaner v2 — Implementierungsplan

## Kontext

Der Ressourcenplaner v1 war ein Prototyp als Single-HTML mit lokalen JSON-Daten. v2 wird eine vollstaendige Web-App mit SharePoint-Backend: Mitarbeiter und Projekte uebereinander legen, Verfuegbarkeiten planen, Bauzeitplaene verwalten. Der Prototyp laeuft auf GitHub Pages + Cloudflare Worker und kann spaeter auf Azure migriert werden.

## Architektur

```
GitHub Pages (Frontend)          Cloudflare Worker (API)         SharePoint Online (DB)
React + Vite + TypeScript   -->  ACS Auth + REST API        -->  SharePoint-Listen
davidmaxschmidt.github.io       ebg-rp-api.*.workers.dev        endlerbau.sharepoint.com
```

Auth: ACS fuer Prototyp (laeuft bis 2. April 2026). Migration zu Entra ID spaeter.

---

## 3 Views

### View 1: Hauptuebersicht (Landing Page)
**Naechste 4 Wochen — besetzte Baustellen**

Hierarchische Darstellung:
```
📍 24.002 DU-Am Unkelstein (Netze DU)     BL: David Schmidt    01.02 - 28.03
  └─ Kolonne Llugani (5 MA)               ⚠️ 1 abwesend
      ├─ Gjinovci B.     ✅ ✅ ✅ ✅ ✅ 🔵 🔵 ✅ ✅ ...  (verfuegbar/Urlaub)
      ├─ Krasniqi A.      ✅ ✅ 🔴 🔴 ✅ ✅ ✅ ✅ ✅ ...  (krank)
      └─ ...

📍 25.503 D-Deiker Hoefe (BLACK HORSE)    BL: Gerald Wegewitz  06.02 - 18.02
  └─ Kolonne Weber (3 MA)                 ✅ voll besetzt
      ├─ ...
```

- Nur Baustellen mit aktiven Zuweisungen in den naechsten 4 Wochen
- Aufklappbar: Projekt → Kolonne → Mitarbeiter → Tagesverfuegbarkeit
- Bauleiter neben Projektname sichtbar
- Kapazitaetswarnungen: ⚠️ Unterbesetzt, 🔴 Doppelzuweisung
- Drag & Drop: Mitarbeiter zwischen Kolonnen/Baustellen verschieben

### View 2: Abwesenheitsplaner
**Orientiert an bestehender Excel-Vorlage**

Monats-Gantt wie in v1, aber mit SharePoint-Backend:
```
                        Februar 2026
Mitarbeiter    UT  KOL  1  2  3  4  5  6  7  8  ...
─────────────────────────────────────────────────
▸ Bauleiter (8)
  Endler C.     6       U  U  U
  Schmidt D.   24          K  K
▸ Leitungsbau (41)
  Gjinovci B.  18       ·  ·  ·  ·  ·  FE ·
  ...
```

- **Gruppierung** wie in Excel (Bauleiter, Poliere, Leitungsbau, Kanalbau, etc.)
- **Mitarbeiter hinzufuegen** direkt in dieser View (+Button → Modal)
- **Abwesenheiten bearbeiten**: Paint-Modus (Klick setzt U/K/FE/P/S/H)
- **Filter**: Suche (Name/PersNr), Gruppe, Nur verfuegbar/abwesend, Zeitraum
- **Zoom**: Tages-, Wochen-, Monatsansicht
- Feiertage + Betriebsurlaub markiert
- Urlaubstage-Zaehler pro Mitarbeiter

### View 3: Projektplanung (Gantt Bauzeitenplan)
**Einzelnes Projekt detailliert planen**

```
24.002 DU-Am Unkelstein (Netze DU)
BL: David Schmidt | AG: Netze DU | Start: 01.02.2026 | Ende (est.): 28.06.2026

Vorgang                  Jan  Feb  Mär  Apr  Mai  Jun
Baustelleneinrichtung    ████
Erdarbeiten                   ████████
Leitungsbau                        █████████████
Verfuellung                                ██████
Asphalt                                         ████
Abnahme                                              █
```

- Kostenstelle auswaehlen → Teilschritte (Gantt-Items) verwalten
- Start/Ende pro Teilschritt (Drag & Drop auf Zeitstrahl)
- Anfang + geschaetztes Ende auf Kostenstellen-Liste erweitern
- Bauleiter zuweisen
- Zugewiesene Kolonnen + deren Verfuegbarkeit einblenden

---

## Design

**Stil: PDF-Messen-orientiert — hell, schlicht, responsiv**

- **Light Theme** (nicht Dark wie v1): `--bg: #E0E0E0`, `--card: #fff`, `--bk: #1a1a1a`
- **Font**: DM Sans (bereits in v1 und PDF-Messen)
- **Header**: Schwarzer Balken, EBG-Logo links, gelber Separator `|`, App-Titel
- **Footer**: `© David Schmidt 2026` auf schwarzem Balken
- **Safe Areas**: `env(safe-area-inset-*)` fuer iPhone Notch
- **Responsive Breakpoints**:
  - Desktop (>1024px): Sidebar-Navigation + Content
  - Tablet (768-1024px): Kompakte Sidebar oder Top-Navigation
  - Mobile (<768px): Bottom-Tab-Navigation, Gantt horizontal scrollbar
- **Touch-Optimiert**: Grosse Tap-Targets (min 44px), Swipe-Gesten fuer Gantt
- **EBG-Akzentfarbe**: `#FFF200` (Gelb) fuer aktive Elemente, Buttons, Highlights

---

## SharePoint-Datenmodell

### Bestehend (unveraendert nutzen):
- **Kostenstellen** (52 Eintraege) — neue Felder hinzufuegen:
  - `StartDatum` (Date) — Projektbeginn
  - `EndeDatum` (Date) — Geschaetztes Projektende
- **Gantt chart** (18 Eintraege) — wie gehabt

### Neu erstellen:

**Mitarbeiter** (119 Eintraege, Migration aus urlaubplan.json):
| Spalte | Typ | Beispiel |
|--------|-----|---------|
| Title | Text | Gjinovci |
| PersNr | Text (eindeutig) | 3271 |
| Gruppe | Choice (15 Werte) | Leitungsbau |
| Notizen | Multiline | zzgl. Geräteführer |
| Urlaubstage | Number | 24 |
| Aktiv | Boolean | true |

**Abwesenheiten** (~3.500 Eintraege/Jahr, je 1 Tag = 1 Eintrag):
| Spalte | Typ | Beispiel |
|--------|-----|---------|
| Title | Text | 3271-2026-02-16 |
| PersNr | Text | 3271 |
| Datum | Date | 2026-02-16 |
| Typ | Choice (U/K/FE/P/S/H/UN/BU) | U |

**KolonneMitglieder** (Join: wer gehoert zu welcher Kolonne):
| Spalte | Typ |
|--------|-----|
| Title | Text (KolId-PersNr) |
| KolonneId | Lookup → Kolonnen |
| PersNr | Text |

**Zuweisungen** (Kolonne → Baustelle mit Zeitraum):
| Spalte | Typ |
|--------|-----|
| Title | Text (KolName-KstNr) |
| KolonneId | Lookup → Kolonnen |
| KostenstelleId | Lookup → Kostenstellen |
| Von | Date |
| Bis | Date |

**Kolonnen** (bestehende leere Liste, Felder ergaenzen):
| Spalte | Typ |
|--------|-----|
| Title | Text (Kolonnenname) |
| Polier | Text |

---

## Cloudflare Worker API

**Name:** `ebg-rp-api` | Pattern aus `09-OutlookAddin-yo/worker/worker.js`

### Endpunkte:
```
GET    /api/mitarbeiter                     Alle aktiven MA
POST   /api/mitarbeiter                     MA anlegen
PUT    /api/mitarbeiter/:id                 MA aktualisieren

GET    /api/abwesenheiten?von=&bis=         Abwesenheiten im Zeitraum
POST   /api/abwesenheiten                   Abwesenheit setzen (oder Batch)
DELETE /api/abwesenheiten/:id               Abwesenheit loeschen

GET    /api/kostenstellen                   Alle aktiven KST
PUT    /api/kostenstellen/:id               KST aktualisieren (Start/Ende/BL)

GET    /api/kolonnen                        Kolonnen mit Mitgliedern (denormalisiert)
POST   /api/kolonnen                        Kolonne erstellen
PUT    /api/kolonnen/:id                    Kolonne bearbeiten
DELETE /api/kolonnen/:id                    Kolonne + Mitglieder loeschen
POST   /api/kolonnen/:id/mitglieder        Mitglied hinzufuegen
DELETE /api/kolonnen/:id/mitglieder/:pNr   Mitglied entfernen

GET    /api/zuweisungen                     Alle Zuweisungen
POST   /api/zuweisungen                     Zuweisung erstellen
PUT    /api/zuweisungen/:id                 Zuweisung aendern
DELETE /api/zuweisungen/:id                 Zuweisung loeschen

GET    /api/gantt?kstNr=24.002              Gantt-Items fuer KST
POST   /api/gantt                           Gantt-Item anlegen
PUT    /api/gantt/:id                       Gantt-Item aendern
DELETE /api/gantt/:id                       Gantt-Item loeschen

GET    /api/health                          Status + Token-Check
```

---

## React-Projektstruktur

```
11-Ressourcenplaner-v2/
  frontend/
    package.json
    vite.config.ts
    index.html
    public/
      EBGLOGO.png
    src/
      main.tsx
      App.tsx                            Router + Layout
      index.css                          Globales CSS (PDF-Messen-Stil)

      api/
        client.ts                        fetch-Wrapper (VITE_API_URL)
        queries.ts                       TanStack Query Hooks
        types.ts                         TypeScript Interfaces

      components/
        layout/
          Header.tsx                     Logo | Separator | Titel | Nav-Buttons
          Footer.tsx                     © David Schmidt 2026
          MobileNav.tsx                  Bottom-Tabs (<768px)
          Layout.tsx                     Responsive Shell

        uebersicht/                      VIEW 1
          UebersichtView.tsx             4-Wochen-Uebersicht
          ProjektRow.tsx                 Aufklappbare Projekt-Zeile
          KolonneRow.tsx                 Kolonne mit Mitgliedern
          MitarbeiterZeile.tsx           Tagesverfuegbarkeit-Dots
          KapazitaetsWarnung.tsx         Unterbesetzt / Doppelzuweisung

        abwesenheiten/                   VIEW 2
          AbwesenheitenView.tsx          Monats-Gantt + Filter + Edit
          GanttGrid.tsx                  Wiederverwendbare Gantt-Tabelle
          GanttCell.tsx                  Einzelne Zelle (klickbar)
          EditToolbar.tsx                Paint-Buttons (U/K/FE...)
          FilterBar.tsx                  Suche, Gruppe, Verfuegbarkeit
          MitarbeiterModal.tsx           Neuen MA hinzufuegen
          ZoomControl.tsx                Tag/Woche/Monat Umschalter

        projektplanung/                  VIEW 3
          ProjektplanungView.tsx         KST-Auswahl + Gantt-Editor
          GanttBalken.tsx                Drag-resizable Zeitbalken
          TeilschrittModal.tsx           Teilschritt anlegen/bearbeiten
          KolonnenOverlay.tsx            Zugewiesene Kolonnen anzeigen

        shared/
          Chip.tsx
          Modal.tsx
          LoadingSpinner.tsx

      hooks/
        useAbwesenheiten.ts
        useAvailability.ts
        useDragDrop.ts

      utils/
        dates.ts                         Datumshilfen
        feiertage.ts                     NRW 2026 + Betriebsurlaub
        colors.ts                        Abwesenheitstyp → Farbe

  worker/
    worker.js                            Cloudflare Worker
    wrangler.toml

  scripts/
    migrate-mitarbeiter.js               urlaubplan.json → SP
    migrate-abwesenheiten.js             Abwesenheiten → SP
```

---

## Implementierungsreihenfolge

### Phase 1: Infrastruktur
1. `brew install gh` + `gh auth login` + Repo erstellen
2. Vite React-Projekt scaffolden (`npm create vite@latest`)
3. ACS App registrieren (oder bestehende `00a1c605` mitnutzen)
4. Cloudflare Worker Projekt anlegen

### Phase 2: Daten
5. SharePoint-Listen erstellen (via M365 CLI / SPO REST)
6. Kostenstellen-Liste erweitern (StartDatum, EndeDatum)
7. Daten migrieren: urlaubplan.json → Mitarbeiter + Abwesenheiten

### Phase 3: Backend
8. Worker implementieren (Auth + alle Endpunkte)
9. Worker deployen + mit curl testen

### Phase 4: Frontend Core
10. Layout (Header, Footer, responsive Shell, Navigation)
11. CSS-System (PDF-Messen-Stil, Light-Theme, responsive)
12. API-Client + TanStack Query Hooks
13. TypeScript Interfaces

### Phase 5: Views
14. View 2: Abwesenheitsplaner (einfachster Start, meiste Logik aus v1)
15. View 1: Hauptuebersicht (braucht Abwesenheitsdaten)
16. View 3: Projektplanung / Gantt

### Phase 6: Polish
17. Drag & Drop fuer Zuweisungen
18. Kapazitaetswarnungen
19. Zoom (Tag/Woche/Monat)
20. Mobile-Optimierung (Bottom-Nav, Touch)

### Phase 7: Deploy
21. GitHub Actions CI/CD
22. End-to-End Test

---

## Kritische Dateien

| Datei | Zweck |
|-------|-------|
| `09-OutlookAddin-yo/worker/worker.js` | Worker-Pattern (ACS, spGet, CORS) |
| `10-Ressourcenplaner/index.html` | v1 Logik (Gantt, Availability Engine) |
| `10-Ressourcenplaner/data/urlaubplan.json` | Migrations-Quelle (119 MA) |
| `06-WebApp/index-neu-mit-sharepoint.html` | Design-Referenz (PDF-Messen) |
| `config/ebg-config.json` | Tenant-ID, SharePoint-URLs |

---

## Azure-Migrationspfad (spaeter)

| Jetzt | Azure |
|-------|-------|
| GitHub Pages | Azure Static Web Apps |
| Cloudflare Worker | Azure Functions |
| ACS Auth | Entra ID SSO |
| Separate CORS | Same-Origin |
| Public Repo | Private + CI/CD |

---

## Verifikation

1. `curl .../api/health` → 200 + Token-Status
2. `curl .../api/mitarbeiter` → 119 Eintraege
3. Frontend: `https://davidmaxschmidt.github.io/ebg-ressourcenplaner/`
4. View 1: Baustellen mit Kolonnen und Verfuegbarkeiten sichtbar
5. View 2: Abwesenheiten bearbeiten → SharePoint-Update → Refresh korrekt
6. View 3: Gantt-Teilschritte anlegen/verschieben → SharePoint persistiert
7. Responsiv: Desktop, iPad, iPhone getestet
