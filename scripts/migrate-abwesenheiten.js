#!/usr/bin/env node
// Migriert Abwesenheiten aus urlaubplan.json → SharePoint-Liste "Abwesenheiten"
// Nutzung: node scripts/migrate-abwesenheiten.js [--dry-run]
//
// Feiertage (Typ "F") werden uebersprungen - sie kommen aus der feiertage.ts Logik.
// Betriebsurlaub wird als "BU" migriert.

import { readFileSync } from 'fs'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DRY_RUN = process.argv.includes('--dry-run')
const SITE_URL = 'https://endlerbau.sharepoint.com/sites/EndlerBauDateien'
const LIST_TITLE = 'Abwesenheiten'
const BATCH_SIZE = 50

const dataPath = join(__dirname, '../../10-Ressourcenplaner/data/urlaubplan.json')
const data = JSON.parse(readFileSync(dataPath, 'utf-8'))

// Collect all non-Feiertag absences
const items = []

for (const gruppe of data.gruppen) {
  for (const ma of gruppe.mitarbeiter) {
    for (const abw of ma.abwesenheiten || []) {
      // Skip Feiertage - those are handled client-side
      if (abw.typ === 'F') continue

      items.push({
        persNr: ma.persNr,
        datum: abw.datum,
        typ: abw.typ,
        title: `${ma.persNr}-${abw.datum}`,
      })
    }
  }
}

console.log(`${items.length} Abwesenheiten zu migrieren (Feiertage uebersprungen)`)

let created = 0
let errors = 0

for (let i = 0; i < items.length; i++) {
  const item = items[i]

  if ((i + 1) % 100 === 0 || i === 0) {
    console.log(`[${i + 1}/${items.length}] ${item.persNr} ${item.datum} ${item.typ}`)
  }

  if (DRY_RUN) {
    created++
    continue
  }

  try {
    const cmd = `m365 spo listitem add --webUrl "${SITE_URL}" --listTitle "${LIST_TITLE}" --Title "${item.title}" --PersNr "${item.persNr}" --Datum "${item.datum}" --Typ "${item.typ}"`
    execSync(cmd, { stdio: 'pipe' })
    created++
  } catch (e) {
    console.error(`  FEHLER bei ${item.title}: ${e.message}`)
    errors++
  }

  // Rate limiting: kleine Pause alle 50 Items
  if (!DRY_RUN && (i + 1) % BATCH_SIZE === 0) {
    await new Promise(r => setTimeout(r, 500))
  }
}

console.log(`\nFertig: ${created} erstellt, ${errors} Fehler, ${items.length} gesamt`)
if (DRY_RUN) console.log('(DRY RUN - nichts geschrieben)')
