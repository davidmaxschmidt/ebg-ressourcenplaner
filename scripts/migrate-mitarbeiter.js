#!/usr/bin/env node
// Migriert Mitarbeiter aus urlaubplan.json → SharePoint-Liste "Mitarbeiter"
// Nutzung: node scripts/migrate-mitarbeiter.js [--dry-run]
//
// Voraussetzung: m365 CLI eingeloggt, SharePoint-Liste "Mitarbeiter" existiert

import { readFileSync } from 'fs'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DRY_RUN = process.argv.includes('--dry-run')
const SITE_URL = 'https://endlerbau.sharepoint.com/sites/EndlerBauDateien'
const LIST_TITLE = 'Mitarbeiter'

// Mapping: urlaubplan.json Gruppenname → SharePoint Choice-Wert
const GRUPPEN_MAP = {
  'Geschäftsleitung': 'Geschaeftsleitung',
  'Bauleiter': 'Bauleiter',
  'Büro': 'Buero',
  'LKW Fahrer': 'Geraetefahrer',
  'Platz': 'Werkstatt/Lager',
  'Leitungsbau': 'Leitungsbau',
  'Asphaltkolonnen': 'Leitungsbau',
  'Pflasterkolonnen': 'Leitungsbau',
  'Kanalbau': 'Kanalbau',
  'Neue Mitarbeiter': 'Sonstige',
  'Springer Personal': 'Sonstige',
  'Duales Studium': 'Azubis',
  'Auszubildende': 'Azubis',
  'Krankengeld / Ausgesteuert': 'Sonstige',
  'Ausgeschiedene Mitarbeiter': 'Sonstige',
}

const dataPath = join(__dirname, '../../10-Ressourcenplaner/data/urlaubplan.json')
const data = JSON.parse(readFileSync(dataPath, 'utf-8'))

let total = 0
let created = 0
let skipped = 0

for (const gruppe of data.gruppen) {
  const gruppeName = GRUPPEN_MAP[gruppe.name] || 'Sonstige'
  const isAktiv = !['Krankengeld / Ausgesteuert', 'Ausgeschiedene Mitarbeiter'].includes(gruppe.name)

  for (const ma of gruppe.mitarbeiter) {
    total++
    const title = ma.name
    const persNr = ma.persNr
    const notizen = ma.notizen || ''
    const urlaubstage = ma.urlaubstage || 0

    console.log(`[${total}] ${persNr} ${title} → ${gruppeName} (${isAktiv ? 'aktiv' : 'inaktiv'})`)

    if (DRY_RUN) {
      created++
      continue
    }

    try {
      const cmd = `m365 spo listitem add --webUrl "${SITE_URL}" --listTitle "${LIST_TITLE}" --Title "${title}" --PersNr "${persNr}" --Gruppe "${gruppeName}" --Notizen "${notizen.replace(/"/g, '\\"')}" --Urlaubstage ${urlaubstage} --Aktiv ${isAktiv}`
      execSync(cmd, { stdio: 'pipe' })
      created++
    } catch (e) {
      console.error(`  FEHLER: ${e.message}`)
      skipped++
    }
  }
}

console.log(`\nFertig: ${created} erstellt, ${skipped} uebersprungen, ${total} gesamt`)
if (DRY_RUN) console.log('(DRY RUN - nichts geschrieben)')
