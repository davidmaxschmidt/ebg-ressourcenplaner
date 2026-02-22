#!/usr/bin/env node
// Erstellt die SharePoint-Listen fuer den Ressourcenplaner
// Nutzung: node scripts/create-sp-lists.js
//
// Voraussetzung: m365 CLI eingeloggt

import { execSync } from 'child_process'

const SITE_URL = 'https://endlerbau.sharepoint.com/sites/EndlerBauDateien'

function run(cmd) {
  console.log(`> ${cmd}`)
  try {
    const result = execSync(`m365 ${cmd}`, { stdio: 'pipe', encoding: 'utf-8' })
    return result
  } catch (e) {
    console.error(`  Fehler: ${e.stderr || e.message}`)
    return null
  }
}

// 1. Mitarbeiter-Liste
console.log('\n=== Mitarbeiter-Liste ===')
run(`spo list add --webUrl "${SITE_URL}" --title "Mitarbeiter" --baseTemplate GenericList`)
run(`spo field add --webUrl "${SITE_URL}" --listTitle "Mitarbeiter" --xml '<Field Type="Text" DisplayName="PersNr" Name="PersNr" Required="TRUE" EnforceUniqueValues="TRUE" Indexed="TRUE" />'`)
run(`spo field add --webUrl "${SITE_URL}" --listTitle "Mitarbeiter" --xml '<Field Type="Choice" DisplayName="Gruppe" Name="Gruppe"><CHOICES><CHOICE>Geschaeftsleitung</CHOICE><CHOICE>Bauleiter</CHOICE><CHOICE>Poliere</CHOICE><CHOICE>Leitungsbau</CHOICE><CHOICE>Kanalbau</CHOICE><CHOICE>Hausanschluss</CHOICE><CHOICE>Werkstatt/Lager</CHOICE><CHOICE>Buero</CHOICE><CHOICE>Azubis</CHOICE><CHOICE>Minijob</CHOICE><CHOICE>Praktikanten</CHOICE><CHOICE>Zeitarbeit</CHOICE><CHOICE>Subunternehmer</CHOICE><CHOICE>Geraetefahrer</CHOICE><CHOICE>Sonstige</CHOICE></CHOICES></Field>'`)
run(`spo field add --webUrl "${SITE_URL}" --listTitle "Mitarbeiter" --xml '<Field Type="Note" DisplayName="Notizen" Name="Notizen" />'`)
run(`spo field add --webUrl "${SITE_URL}" --listTitle "Mitarbeiter" --xml '<Field Type="Number" DisplayName="Urlaubstage" Name="Urlaubstage" Min="0" Max="50" />'`)
run(`spo field add --webUrl "${SITE_URL}" --listTitle "Mitarbeiter" --xml '<Field Type="Boolean" DisplayName="Aktiv" Name="Aktiv"><Default>1</Default></Field>'`)

// 2. Abwesenheiten-Liste
console.log('\n=== Abwesenheiten-Liste ===')
run(`spo list add --webUrl "${SITE_URL}" --title "Abwesenheiten" --baseTemplate GenericList`)
run(`spo field add --webUrl "${SITE_URL}" --listTitle "Abwesenheiten" --xml '<Field Type="Text" DisplayName="PersNr" Name="PersNr" Required="TRUE" Indexed="TRUE" />'`)
run(`spo field add --webUrl "${SITE_URL}" --listTitle "Abwesenheiten" --xml '<Field Type="DateTime" DisplayName="Datum" Name="Datum" Format="DateOnly" Required="TRUE" Indexed="TRUE" />'`)
run(`spo field add --webUrl "${SITE_URL}" --listTitle "Abwesenheiten" --xml '<Field Type="Choice" DisplayName="Typ" Name="Typ" Required="TRUE"><CHOICES><CHOICE>U</CHOICE><CHOICE>K</CHOICE><CHOICE>FE</CHOICE><CHOICE>P</CHOICE><CHOICE>S</CHOICE><CHOICE>H</CHOICE><CHOICE>UN</CHOICE><CHOICE>BU</CHOICE></CHOICES></Field>'`)

// 3. KolonneMitglieder-Liste
console.log('\n=== KolonneMitglieder-Liste ===')
run(`spo list add --webUrl "${SITE_URL}" --title "KolonneMitglieder" --baseTemplate GenericList`)
run(`spo field add --webUrl "${SITE_URL}" --listTitle "KolonneMitglieder" --xml '<Field Type="Number" DisplayName="KolonneId" Name="KolonneId" Required="TRUE" />'`)
run(`spo field add --webUrl "${SITE_URL}" --listTitle "KolonneMitglieder" --xml '<Field Type="Text" DisplayName="PersNr" Name="PersNr" Required="TRUE" />'`)

// 4. Zuweisungen-Liste
console.log('\n=== Zuweisungen-Liste ===')
run(`spo list add --webUrl "${SITE_URL}" --title "Zuweisungen" --baseTemplate GenericList`)
run(`spo field add --webUrl "${SITE_URL}" --listTitle "Zuweisungen" --xml '<Field Type="Number" DisplayName="KolonneId" Name="KolonneId" Required="TRUE" />'`)
run(`spo field add --webUrl "${SITE_URL}" --listTitle "Zuweisungen" --xml '<Field Type="Number" DisplayName="KostenstelleId" Name="KostenstelleId" Required="TRUE" />'`)
run(`spo field add --webUrl "${SITE_URL}" --listTitle "Zuweisungen" --xml '<Field Type="DateTime" DisplayName="Von" Name="Von" Format="DateOnly" Required="TRUE" />'`)
run(`spo field add --webUrl "${SITE_URL}" --listTitle "Zuweisungen" --xml '<Field Type="DateTime" DisplayName="Bis" Name="Bis" Format="DateOnly" Required="TRUE" />'`)

// 5. Kolonnen-Liste erweitern (existiert schon, Felder ergaenzen)
console.log('\n=== Kolonnen-Liste (Felder ergaenzen) ===')
run(`spo field add --webUrl "${SITE_URL}" --listTitle "Kolonnen" --xml '<Field Type="Text" DisplayName="Polier" Name="Polier" />'`)

// 6. Kostenstellen erweitern (existiert schon)
console.log('\n=== Kostenstellen (Felder ergaenzen) ===')
run(`spo field add --webUrl "${SITE_URL}" --listTitle "Kostenstellen" --xml '<Field Type="DateTime" DisplayName="StartDatum" Name="StartDatum" Format="DateOnly" />'`)
run(`spo field add --webUrl "${SITE_URL}" --listTitle "Kostenstellen" --xml '<Field Type="DateTime" DisplayName="EndeDatum" Name="EndeDatum" Format="DateOnly" />'`)
run(`spo field add --webUrl "${SITE_URL}" --listTitle "Kostenstellen" --xml '<Field Type="Text" DisplayName="Bauleiter" Name="Bauleiter" />'`)
run(`spo field add --webUrl "${SITE_URL}" --listTitle "Kostenstellen" --xml '<Field Type="Text" DisplayName="Auftraggeber" Name="Auftraggeber" />'`)

console.log('\n=== Fertig! ===')
