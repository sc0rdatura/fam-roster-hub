require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DATA_DIR = path.join(__dirname, 'data');

// Excel epoch: Jan 0, 1900 (day 1 = Jan 1, 1900).
// Lotus 123 bug: Excel treats 1900 as a leap year, so serials >= 60 are off by one day.
function excelSerialToDate(serial) {
  if (typeof serial !== 'number' || serial < 1) return null;
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  const adjusted = serial > 59 ? serial - 1 : serial;
  const ms = excelEpoch.getTime() + adjusted * 86400000;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function parseDate(value) {
  if (value == null || value === '') return { date: null, warning: false };

  if (typeof value === 'number') {
    const d = excelSerialToDate(value);
    if (d) return { date: d, warning: false };
    return { date: null, warning: true };
  }

  const str = String(value).trim();
  if (!str) return { date: null, warning: false };

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return { date: parsed.toISOString().slice(0, 10), warning: false };
  }
  return { date: null, warning: true };
}

function blankToNull(value) {
  if (value == null) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
}

async function lookupClient(fullName) {
  const { data, error } = await supabase
    .from('clients')
    .select('id, full_name')
    .ilike('full_name', fullName)
    .is('deleted_at', null)
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error(`Client "${fullName}" not found in the clients table. Aborting.`);
  }
  return data;
}

async function findPerson(fullName) {
  const { data, error } = await supabase
    .from('people')
    .select('id, full_name')
    .ilike('full_name', fullName)
    .is('deleted_at', null)
    .limit(1);

  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
}

async function createPerson(fullName, primaryRole) {
  const { data, error } = await supabase
    .from('people')
    .insert({ full_name: fullName, primary_role: primaryRole })
    .select('id, full_name')
    .single();

  if (error) throw error;
  return data;
}

async function findRelationship(clientId, personId) {
  const { data, error } = await supabase
    .from('relationships')
    .select('id')
    .eq('client_id', clientId)
    .eq('person_id', personId)
    .is('deleted_at', null)
    .limit(1);

  if (error) throw error;
  return data && data.length > 0;
}

async function createRelationship(clientId, personId, notes, lastContactDate) {
  const { error } = await supabase
    .from('relationships')
    .insert({
      client_id: clientId,
      person_id: personId,
      heat_level: 'Warm',
      notes,
      last_contact_date: lastContactDate,
      created_from_credit: false,
    });

  if (error) throw error;
}

async function processFile(fileName, clientName, sheetName, columnMap) {
  const filePath = path.join(DATA_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    console.warn(`\nWARNING: File not found, skipping: ${filePath}`);
    return;
  }

  console.log(`\n--- Processing: ${fileName} (client: ${clientName}) ---\n`);

  const client = await lookupClient(clientName);
  console.log(`Found client: ${client.full_name} (${client.id})\n`);

  const workbook = XLSX.readFile(filePath);
  if (!workbook.SheetNames.includes(sheetName)) {
    console.error(`Sheet "${sheetName}" not found in ${fileName}. Available sheets: ${workbook.SheetNames.join(', ')}`);
    return;
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });

  const stats = {
    processed: 0,
    peopleCreated: 0,
    peopleExisted: 0,
    relationshipsCreated: 0,
    relationshipsSkipped: 0,
    dateWarnings: 0,
    errors: 0,
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-indexed, header is row 1
    const rawName = row[columnMap.name];

    if (rawName == null || String(rawName).trim() === '') continue;

    const personName = String(rawName).trim();
    stats.processed++;

    try {
      const primaryRole = blankToNull(row[columnMap.role]);
      const notes = blankToNull(row[columnMap.notes]);
      const rawDate = row[columnMap.lastCheckIn];
      const { date: lastContactDate, warning: dateWarning } = parseDate(rawDate);

      if (dateWarning) {
        console.warn(`  Row ${rowNum}: Date parse warning for "${personName}" — raw value: ${JSON.stringify(rawDate)}`);
        stats.dateWarnings++;
      }

      let person = await findPerson(personName);
      if (person) {
        console.log(`  Row ${rowNum}: Person already exists: ${person.full_name}`);
        stats.peopleExisted++;
      } else {
        person = await createPerson(personName, primaryRole);
        console.log(`  Row ${rowNum}: Person created: ${person.full_name}`);
        stats.peopleCreated++;
      }

      const exists = await findRelationship(client.id, person.id);
      if (exists) {
        console.log(`  Row ${rowNum}: Skipped: relationship already exists for ${personName}`);
        stats.relationshipsSkipped++;
      } else {
        await createRelationship(client.id, person.id, notes, lastContactDate);
        console.log(`  Row ${rowNum}: Relationship created for ${personName}`);
        stats.relationshipsCreated++;
      }
    } catch (err) {
      console.error(`  Row ${rowNum}: ERROR for "${personName}" — ${err.message}`);
      stats.errors++;
    }
  }

  console.log(`\n=== ${clientName} Import Summary ===`);
  console.log(`Rows processed: ${stats.processed}`);
  console.log(`People created: ${stats.peopleCreated}`);
  console.log(`People already existed: ${stats.peopleExisted}`);
  console.log(`Relationships created: ${stats.relationshipsCreated}`);
  console.log(`Relationships skipped (already existed): ${stats.relationshipsSkipped}`);
  console.log(`Date parse warnings: ${stats.dateWarnings}`);
  console.log(`Errors: ${stats.errors}`);
}

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  await processFile(
    'Contact_Tracking_Sheet_-_Rael_Jones.xlsx',
    'Rael Jones',
    'Sheet1',
    {
      name: 'NAME',
      role: 'POSITION',
      notes: 'RELATIONSHIP/NOTES',
      lastCheckIn: 'LAST CHECK-IN',
    }
  );

  await processFile(
    'Re_Olunuga_-_Client_Hub.xlsx',
    'Re Olunuga',
    'Contacts',
    {
      name: 'NAME',
      role: 'POSITION/COMPANY',
      notes: 'RELATIONSHIP/NOTES',
      lastCheckIn: 'LAST CHECK-IN',
    }
  );

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(`\nFATAL: ${err.message}`);
  process.exit(1);
});
