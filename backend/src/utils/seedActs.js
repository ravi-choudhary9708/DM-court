/**
 * NyayaSahayak — Full Legal Acts Database Seeder
 * ================================================
 * Loads all JSON act files from backend/src/data/acts/ and seeds
 * them into MongoDB (LegalAct + LegalSection collections).
 *
 * Run: npm run seed:acts
 *
 * Features:
 *  - Reads all JSON files in data/acts/ automatically
 *  - Upserts (creates or updates) acts and sections by shortName / actId+sectionNumber
 *  - Safe to run multiple times (idempotent)
 *  - Reports counts at the end
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const LegalAct = require('../models/LegalAct');
const LegalSection = require('../models/LegalSection');

const ACTS_DIR = path.join(__dirname, '../data/acts');

// ── Color helpers for console output ─────────────────────────────────────────
const green  = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const red    = (s) => `\x1b[31m${s}\x1b[0m`;
const cyan   = (s) => `\x1b[36m${s}\x1b[0m`;
const bold   = (s) => `\x1b[1m${s}\x1b[0m`;

// ── Main seeder function ──────────────────────────────────────────────────────
async function seedActs() {
  let totalActsCreated = 0;
  let totalActsUpdated = 0;
  let totalSectionsCreated = 0;
  let totalSectionsUpdated = 0;
  let totalErrors = 0;

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(green('✅ Connected to MongoDB'));

    // Read all JSON files in the acts directory
    if (!fs.existsSync(ACTS_DIR)) {
      console.error(red(`❌ Acts directory not found: ${ACTS_DIR}`));
      process.exit(1);
    }

    const files = fs.readdirSync(ACTS_DIR).filter((f) => f.endsWith('.json'));
    if (files.length === 0) {
      console.warn(yellow('⚠  No JSON files found in data/acts/'));
      process.exit(0);
    }

    console.log(bold(`\n📁 Found ${files.length} act files in data/acts/\n`));

    // Process each file
    for (const file of files) {
      const filePath = path.join(ACTS_DIR, file);
      let actData;

      try {
        actData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch (parseErr) {
        console.error(red(`❌ Failed to parse ${file}: ${parseErr.message}`));
        totalErrors++;
        continue;
      }

      console.log(cyan(`\n📚 Processing: ${actData.actName} (${actData.actYear}) [${file}]`));

      // ── Upsert the Act ────────────────────────────────────────────────────
      const actPayload = {
        actName:      actData.actName,
        actNameHindi: actData.actNameHindi,
        actYear:      actData.actYear,
        shortName:    actData.shortName,
        jurisdiction: actData.jurisdiction || 'Bihar',
        actType:      actData.actType || 'state',
        status:       actData.status || 'active',
        description:  actData.description,
        officialSource: actData.officialSource,
      };

      const existingAct = await LegalAct.findOne({ shortName: actData.shortName });
      let actDoc;

      if (existingAct) {
        // Update existing act
        actDoc = await LegalAct.findByIdAndUpdate(existingAct._id, actPayload, { new: true });
        console.log(yellow(`  ↻  Act updated: ${actDoc.actName} (${actDoc.actYear})`));
        totalActsUpdated++;
      } else {
        actDoc = await LegalAct.create(actPayload);
        console.log(green(`  ✅ Act created: ${actDoc.actName} (${actDoc.actYear})`));
        totalActsCreated++;
      }

      // ── Upsert Sections ───────────────────────────────────────────────────
      const sections = actData.sections || [];
      console.log(`     Sections to process: ${sections.length}`);

      for (const sec of sections) {
        try {
          const sectionPayload = {
            actId:             actDoc._id,
            sectionNumber:     sec.sectionNumber,
            sectionTitle:      sec.sectionTitle,
            sectionTitleHindi: sec.sectionTitleHindi,
            text:              sec.text,
            textHindi:         sec.textHindi,
            summary:           sec.summary,
            effectiveFrom:     sec.effectiveFrom ? new Date(sec.effectiveFrom) : new Date('1900-01-01'),
            effectiveTo:       sec.effectiveTo   ? new Date(sec.effectiveTo) : null,
            versionNote:       sec.versionNote,
            keywords:          sec.keywords || [],
            embeddingStatus:   'pending', // will be generated on first RAG search
          };

          const existingSection = await LegalSection.findOne({
            actId:         actDoc._id,
            sectionNumber: sec.sectionNumber,
          });

          if (existingSection) {
            await LegalSection.findByIdAndUpdate(existingSection._id, sectionPayload);
            console.log(yellow(`    ↻  Section §${sec.sectionNumber} updated`));
            totalSectionsUpdated++;
          } else {
            await LegalSection.create(sectionPayload);
            console.log(green(`    ✅ Section §${sec.sectionNumber} — ${sec.sectionTitle || ''}`));
            totalSectionsCreated++;
          }
        } catch (sectionErr) {
          console.error(red(`    ❌ Error seeding section §${sec.sectionNumber}: ${sectionErr.message}`));
          totalErrors++;
        }
      }
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log(bold('\n══════════════════════════════════════════════'));
    console.log(bold('🎉 Seeding complete!'));
    console.log(bold('══════════════════════════════════════════════'));
    console.log(green(`   Acts created:    ${totalActsCreated}`));
    console.log(yellow(`   Acts updated:    ${totalActsUpdated}`));
    console.log(green(`   Sections created: ${totalSectionsCreated}`));
    console.log(yellow(`   Sections updated: ${totalSectionsUpdated}`));
    if (totalErrors > 0) {
      console.log(red(`   Errors:           ${totalErrors}`));
    }

    // Show total DB counts
    const totalActs     = await LegalAct.countDocuments();
    const totalSections = await LegalSection.countDocuments();
    console.log(bold(`\n📊 Total in DB — Acts: ${totalActs} | Sections: ${totalSections}`));
    console.log('\n💡 Note: Section embeddings are marked as "pending" and will be generated');
    console.log('   automatically on the first RAG search call.\n');

  } catch (err) {
    console.error(red(`\n❌ Fatal error: ${err.message}`));
    console.error(err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log(green('Disconnected from MongoDB.'));
  }
}

seedActs();
