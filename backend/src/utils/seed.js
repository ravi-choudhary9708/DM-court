/**
 * NyayaSahayak — Bihar Acts & Rules Seed Script
 * Run: npm run seed
 *
 * Seeds:
 *  - Core Bihar + Central Acts (LegalAct)
 *  - Key sections for each act (LegalSection)
 *  - Mandatory legal rules for DM Court case types (LegalRule)
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const LegalAct = require('../models/LegalAct');
const LegalSection = require('../models/LegalSection');
const LegalRule = require('../models/LegalRule');
const User = require('../models/User');


// ─── Bihar + Central Acts Data ────────────────────────────────────────────────

const ACTS = [
  {
    actName: 'Bihar Land Reforms Act',
    actNameHindi: 'बिहार भूमि सुधार अधिनियम',
    actYear: 1950,
    shortName: 'BLR Act',
    jurisdiction: 'Bihar',
    actType: 'state',
    status: 'active',
    description: 'Provides for acquisition of estates and tenures in Bihar and for other matters.',
  },
  {
    actName: 'Bihar Revenue Code',
    actNameHindi: 'बिहार राजस्व संहिता',
    actYear: 2011,
    shortName: 'BRC 2011',
    jurisdiction: 'Bihar',
    actType: 'state',
    status: 'active',
    description: 'Consolidates and amends laws relating to land, land records and revenue in Bihar.',
  },
  {
    actName: 'Arms Act',
    actNameHindi: 'शस्त्र अधिनियम',
    actYear: 1959,
    shortName: 'Arms Act',
    jurisdiction: 'Bihar',
    actType: 'central',
    status: 'active',
    description: 'Regulates manufacture, sale, use, import/export and transport of arms and ammunition.',
  },
  {
    actName: 'Bihar Prohibition and Excise Act',
    actNameHindi: 'बिहार निषेध एवं उत्पाद शुल्क अधिनियम',
    actYear: 2016,
    shortName: 'BPEA 2016',
    jurisdiction: 'Bihar',
    actType: 'state',
    status: 'active',
    description: 'Prohibits manufacture, sale, possession and consumption of liquor in Bihar.',
  },
  {
    actName: 'Code of Criminal Procedure',
    actNameHindi: 'दंड प्रक्रिया संहिता',
    actYear: 1973,
    shortName: 'CrPC',
    jurisdiction: 'Bihar',
    actType: 'central',
    status: 'active',
    description: 'Provides procedural framework for criminal law in India including DM powers.',
  },
  {
    actName: 'Indian Penal Code',
    actNameHindi: 'भारतीय दंड संहिता',
    actYear: 1860,
    shortName: 'IPC',
    jurisdiction: 'Bihar',
    actType: 'central',
    status: 'active',
    description: 'Main criminal code of India — governs offences and their punishments.',
  },
  {
    actName: 'Transfer of Property Act',
    actNameHindi: 'संपत्ति अंतरण अधिनियम',
    actYear: 1882,
    shortName: 'TP Act',
    jurisdiction: 'Bihar',
    actType: 'central',
    status: 'active',
    description: 'Regulates transfer of property between living persons in India.',
  },
  {
    actName: 'Indian Evidence Act',
    actNameHindi: 'भारतीय साक्ष्य अधिनियम',
    actYear: 1872,
    shortName: 'Evidence Act',
    jurisdiction: 'Bihar',
    actType: 'central',
    status: 'active',
    description: 'Governs admissibility and relevancy of evidence in court proceedings.',
  },
  {
    actName: 'Bihar Tenancy Act',
    actNameHindi: 'बिहार काश्तकारी अधिनियम',
    actYear: 1885,
    shortName: 'BTA 1885',
    jurisdiction: 'Bihar',
    actType: 'state',
    status: 'active',
    description: 'Regulates the rights and liabilities of landlords and tenants in Bihar.',
  },
  {
    actName: 'Limitation Act',
    actNameHindi: 'परिसीमा अधिनियम',
    actYear: 1963,
    shortName: 'Limitation Act',
    jurisdiction: 'Bihar',
    actType: 'central',
    status: 'active',
    description: 'Prescribes time limits for filing suits and legal proceedings.',
  },
];

// ─── Key Sections per Act ─────────────────────────────────────────────────────

const getSections = (actMap) => [
  // Bihar Land Reforms Act
  {
    actId: actMap['BLR Act'],
    sectionNumber: '4',
    sectionTitle: 'Vesting of Estates in State',
    sectionTitleHindi: 'राज्य में सम्पदा का निहित होना',
    text: 'With effect from the date of vesting, every estate and the rights of every proprietor of such estate shall vest in the State of Bihar free from all encumbrances.',
    effectiveFrom: new Date('1950-01-01'),
    keywords: ['vesting', 'estate', 'proprietor', 'encumbrances', 'Bihar'],
  },
  {
    actId: actMap['BLR Act'],
    sectionNumber: '6',
    sectionTitle: 'Consequences of Vesting',
    sectionTitleHindi: 'अधिहरण के परिणाम',
    text: 'When an estate or tenure vests in the State, all grants, leases, contracts relating to such estate become void except as otherwise provided by this Act.',
    effectiveFrom: new Date('1950-01-01'),
    keywords: ['vesting', 'grants', 'leases', 'contracts', 'void'],
  },
  // Bihar Revenue Code
  {
    actId: actMap['BRC 2011'],
    sectionNumber: '114',
    sectionTitle: 'Mutation of Land Records — Dakhil Kharij',
    sectionTitleHindi: 'दाखिल-खारिज',
    text: 'When any person becomes entitled to occupy land by reason of inheritance, purchase, gift, exchange, or otherwise, he shall apply to the Revenue Officer for mutation of his name in the record of rights within 90 days of acquiring such right.',
    effectiveFrom: new Date('2011-01-01'),
    keywords: ['mutation', 'dakhil kharij', 'land records', 'record of rights', 'inheritance', 'purchase', 'gift'],
  },
  {
    actId: actMap['BRC 2011'],
    sectionNumber: '115',
    sectionTitle: 'Procedure for Mutation',
    sectionTitleHindi: 'दाखिल-खारिज की प्रक्रिया',
    text: 'On receipt of an application for mutation, the Revenue Officer shall cause a notice to be issued to all interested parties and shall, after inquiry, pass an order either allowing or rejecting the mutation.',
    effectiveFrom: new Date('2011-01-01'),
    keywords: ['mutation procedure', 'notice', 'inquiry', 'Revenue Officer', 'interested parties'],
  },
  {
    actId: actMap['BRC 2011'],
    sectionNumber: '118',
    sectionTitle: 'Appeal Against Mutation Order',
    sectionTitleHindi: 'दाखिल-खारिज के आदेश के विरुद्ध अपील',
    text: 'Any person aggrieved by an order of mutation may prefer an appeal to the Sub-Divisional Officer within 60 days of the order. Further appeal lies to the District Collector.',
    effectiveFrom: new Date('2011-01-01'),
    keywords: ['appeal', 'mutation', 'Sub-Divisional Officer', 'District Collector', '60 days'],
  },
  // Arms Act
  {
    actId: actMap['Arms Act'],
    sectionNumber: '3',
    sectionTitle: 'Licence for Acquisition and Possession of Firearms',
    sectionTitleHindi: 'आग्नेयास्त्र के अधिग्रहण और कब्जे के लिए लाइसेंस',
    text: 'No person shall acquire, have in his possession, or carry any firearm or ammunition unless he holds a licence issued in accordance with the provisions of this Act and the rules made thereunder.',
    effectiveFrom: new Date('1959-01-01'),
    keywords: ['arms licence', 'firearm', 'possession', 'ammunition', 'licence'],
  },
  {
    actId: actMap['Arms Act'],
    sectionNumber: '25',
    sectionTitle: 'Punishment for Possession without Licence',
    sectionTitleHindi: 'लाइसेंस के बिना अधिकार रखने का दंड',
    text: 'Whoever acquires, has in his possession, or carries any firearm or ammunition in contravention of Section 3 shall be punishable with imprisonment for a term which shall not be less than 3 years but may extend to 7 years, and shall also be liable to fine.',
    effectiveFrom: new Date('1959-01-01'),
    keywords: ['punishment', 'unlicensed', 'firearm', 'imprisonment', '3 years', '7 years'],
  },
  // BPEA 2016
  {
    actId: actMap['BPEA 2016'],
    sectionNumber: '4',
    sectionTitle: 'Total Prohibition of Liquor',
    sectionTitleHindi: 'मद्य पर पूर्ण प्रतिबंध',
    text: 'No person shall produce, bottle, distribute, transport, collect, store, possess, sell by wholesale or retail, export or import any intoxicant in any part of Bihar except for bonafide medicinal or industrial purposes as permitted by the Government.',
    effectiveFrom: new Date('2016-04-05'),
    keywords: ['prohibition', 'liquor', 'intoxicant', 'Bihar', 'manufacture', 'sale', 'possession'],
  },
  {
    actId: actMap['BPEA 2016'],
    sectionNumber: '53',
    sectionTitle: 'Punishment for Consumption',
    sectionTitleHindi: 'उपभोग के लिए दंड',
    text: 'Whoever consumes any intoxicating liquor within the State of Bihar shall be punished with imprisonment for a term which may extend to 5 years and a fine, or both.',
    effectiveFrom: new Date('2016-04-05'),
    keywords: ['punishment', 'consumption', 'liquor', 'excise', 'imprisonment'],
  },
  // CrPC
  {
    actId: actMap['CrPC'],
    sectionNumber: '107',
    sectionTitle: 'Security for Keeping Peace',
    sectionTitleHindi: 'शांति बनाए रखने की जमानत',
    text: 'When an Executive Magistrate receives information that any person is likely to commit a breach of the peace or disturb the public tranquillity, he may require such person to show cause why he should not be ordered to execute a bond for keeping peace.',
    effectiveFrom: new Date('1973-01-01'),
    keywords: ['security', 'peace', 'breach of peace', 'Executive Magistrate', 'bond', 'public order'],
  },
  {
    actId: actMap['CrPC'],
    sectionNumber: '144',
    sectionTitle: 'Power to Issue Order in Urgent Cases',
    sectionTitleHindi: 'आपातकालीन आदेश जारी करने की शक्ति',
    text: 'In cases of emergency or danger to human life, health or safety, or a disturbance of the public tranquillity, a District Magistrate may direct any person to abstain from a certain act or to take certain order with certain property in his possession or under his management.',
    effectiveFrom: new Date('1973-01-01'),
    keywords: ['Section 144', 'emergency', 'public order', 'District Magistrate', 'prohibitory order'],
  },
  {
    actId: actMap['CrPC'],
    sectionNumber: '145',
    sectionTitle: 'Procedure for Disputes Concerning Land',
    sectionTitleHindi: 'भूमि संबंधी विवादों की प्रक्रिया',
    text: 'Whenever an Executive Magistrate is satisfied that a dispute likely to cause breach of peace exists concerning any land or water, he shall make an order stating the grounds of his being so satisfied and requiring the parties concerned to attend his court.',
    effectiveFrom: new Date('1973-01-01'),
    keywords: ['land dispute', 'breach of peace', 'Executive Magistrate', 'possession', 'Section 145'],
  },
  // Transfer of Property Act
  {
    actId: actMap['TP Act'],
    sectionNumber: '54',
    sectionTitle: 'Sale — Definition',
    sectionTitleHindi: 'विक्रय — परिभाषा',
    text: '"Sale" is a transfer of ownership in exchange for a price paid or promised or part-paid and part-promised. Sale of immoveable property of the value of one hundred rupees and upwards can be made only by a registered instrument.',
    effectiveFrom: new Date('1882-01-01'),
    keywords: ['sale', 'transfer of ownership', 'price', 'registered instrument', 'immoveable property'],
  },
  // Evidence Act
  {
    actId: actMap['Evidence Act'],
    sectionNumber: '35',
    sectionTitle: 'Relevancy of Entry in Public Record',
    sectionTitleHindi: 'सार्वजनिक अभिलेख में प्रविष्टि की प्रासंगिकता',
    text: 'An entry in any public or other official book, register, or record or an electronic record stating a fact in issue or relevant fact, made by a public servant in discharge of his official duty or by any other person in performance of a duty specially enjoined by the law of the country in which such book, register, or record is kept, is itself a relevant fact.',
    effectiveFrom: new Date('1872-01-01'),
    keywords: ['public record', 'official record', 'relevant fact', 'public servant', 'land records', 'jamabandi'],
  },
  // Limitation Act
  {
    actId: actMap['Limitation Act'],
    sectionNumber: '1',
    sectionTitle: 'Limitation Periods — General',
    sectionTitleHindi: 'परिसीमा अवधि — सामान्य',
    text: 'Every suit instituted, appeal preferred, and application made after the prescribed period shall be dismissed, although limitation has not been set up as a defence.',
    effectiveFrom: new Date('1963-01-01'),
    keywords: ['limitation', 'prescribed period', 'time-barred', 'suit', 'appeal'],
  },
];

// ─── Legal Rules (deterministic rule engine) ──────────────────────────────────

const RULES = [
  // Universal rules (apply to all case types)
  {
    ruleCode: 'RULE-001',
    description: 'Party A (Petitioner) must have submitted at least one document',
    descriptionHindi: 'पक्षकार अ (वादी) को कम से कम एक दस्तावेज़ प्रस्तुत करना चाहिए',
    caseTypes: [],
    condition: { type: 'document_required', party: 'A', documentType: 'application' },
    action: 'FLAG_INCOMPLETE',
    message: 'Party A has not submitted an application or any document. Please upload Party A documents before proceeding.',
    mandatory: true,
    jurisdiction: 'Bihar',
  },
  {
    ruleCode: 'RULE-002',
    description: 'Case subject must be filled',
    descriptionHindi: 'वाद का विषय भरा होना चाहिए',
    caseTypes: [],
    condition: { type: 'field_required', field: 'subject' },
    action: 'BLOCK_PROCEED',
    message: 'Case subject is missing. Please fill in the case subject.',
    mandatory: true,
    jurisdiction: 'Bihar',
  },
  {
    ruleCode: 'RULE-003',
    description: 'Case filed date must be provided',
    descriptionHindi: 'वाद दाखिल तिथि अनिवार्य है',
    caseTypes: [],
    condition: { type: 'field_required', field: 'filedDate' },
    action: 'BLOCK_PROCEED',
    message: 'Filed date is missing on this case.',
    mandatory: true,
    jurisdiction: 'Bihar',
  },
  // Land dispute rules
  {
    ruleCode: 'RULE-010',
    description: 'Land dispute: Party A must submit Jamabandi or Land Record',
    descriptionHindi: 'भूमि विवाद: पक्षकार अ को जमाबंदी या भूमि अभिलेख प्रस्तुत करना होगा',
    caseTypes: ['land_dispute'],
    condition: { type: 'document_required', party: 'A', documentType: 'jamabandi' },
    action: 'FLAG_INCOMPLETE',
    message: 'Land dispute cases require Party A to submit Jamabandi (जमाबंदी). Document is missing.',
    mandatory: true,
    jurisdiction: 'Bihar',
  },
  {
    ruleCode: 'RULE-011',
    description: 'Land dispute: Police Station must be specified',
    descriptionHindi: 'भूमि विवाद: थाने का नाम अनिवार्य है',
    caseTypes: ['land_dispute'],
    condition: { type: 'field_required', field: 'policeStation' },
    action: 'WARN',
    message: 'Police station is not filled. Land disputes often require a PS reference.',
    mandatory: false,
    jurisdiction: 'Bihar',
  },
  // Mutation rules
  {
    ruleCode: 'RULE-020',
    description: 'Mutation: Applicant must submit land record proof',
    descriptionHindi: 'दाखिल-खारिज: आवेदक को भूमि अभिलेख प्रस्तुत करना होगा',
    caseTypes: ['mutation'],
    condition: { type: 'document_required', party: 'A', documentType: 'land_record' },
    action: 'FLAG_INCOMPLETE',
    message: 'Mutation cases require land record documents from the applicant.',
    mandatory: true,
    jurisdiction: 'Bihar',
  },
  {
    ruleCode: 'RULE-021',
    description: 'Mutation: Revenue receipt must be present',
    descriptionHindi: 'दाखिल-खारिज: राजस्व रसीद अनिवार्य है',
    caseTypes: ['mutation'],
    condition: { type: 'document_required', party: 'A', documentType: 'revenue_receipt' },
    action: 'FLAG_INCOMPLETE',
    message: 'Mutation cases require latest revenue receipt (malguzari rasid).',
    mandatory: true,
    jurisdiction: 'Bihar',
  },
  // Arms Act rules
  {
    ruleCode: 'RULE-030',
    description: 'Arms Act: Police report must be submitted by court',
    descriptionHindi: 'शस्त्र अधिनियम: पुलिस रिपोर्ट न्यायालय द्वारा प्रस्तुत होनी चाहिए',
    caseTypes: ['arms_act'],
    condition: { type: 'document_required', party: 'court', documentType: 'police_report' },
    action: 'BLOCK_PROCEED',
    message: 'Arms Act cases cannot proceed without a police report. Please upload police report.',
    mandatory: true,
    jurisdiction: 'Bihar',
  },
  // Excise rules
  {
    ruleCode: 'RULE-040',
    description: 'Excise: Police/Excise report must be present',
    descriptionHindi: 'उत्पाद: पुलिस/उत्पाद रिपोर्ट अनिवार्य है',
    caseTypes: ['excise'],
    condition: { type: 'document_required', party: 'court', documentType: 'police_report' },
    action: 'BLOCK_PROCEED',
    message: 'Excise cases require a police or excise department report.',
    mandatory: true,
    jurisdiction: 'Bihar',
  },
  // Limitation check
  {
    ruleCode: 'RULE-099',
    description: 'Case must not be time-barred (filed within 3 years)',
    descriptionHindi: 'वाद परिसीमा से बाधित नहीं होना चाहिए (3 वर्ष के भीतर)',
    caseTypes: [],
    condition: { type: 'date_check' },
    action: 'WARN',
    message: 'The filed date is more than 3 years ago. Verify that the case is not time-barred under the Limitation Act 1963.',
    mandatory: false,
    jurisdiction: 'Bihar',
  },
];

// ─── Seed Function ────────────────────────────────────────────────────────────

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // ── Acts ──────────────────────────────────────────────────────────────────
    console.log('\n📚 Seeding Legal Acts...');
    const actMap = {};

    for (const actData of ACTS) {
      const existing = await LegalAct.findOne({ shortName: actData.shortName });
      if (existing) {
        console.log(`  ⏭  Act already exists: ${actData.shortName}`);
        actMap[actData.shortName] = existing._id;
      } else {
        const act = await LegalAct.create(actData);
        actMap[actData.shortName] = act._id;
        console.log(`  ✅ Created Act: ${act.actName} (${act.actYear})`);
      }
    }

    // ── Sections ──────────────────────────────────────────────────────────────
    console.log('\n📖 Seeding Legal Sections...');
    const sections = getSections(actMap);

    for (const sectionData of sections) {
      const existing = await LegalSection.findOne({
        actId: sectionData.actId,
        sectionNumber: sectionData.sectionNumber,
      });

      if (existing) {
        console.log(`  ⏭  Section already exists: ${sectionData.sectionNumber} (Act: ${sectionData.actId})`);
      } else {
        const section = await LegalSection.create({
          ...sectionData,
          embeddingStatus: 'pending', // Will be generated on first RAG search
        });
        console.log(`  ✅ Created Section: § ${section.sectionNumber} — ${section.sectionTitle || ''}`);
      }
    }

    // ── Rules ─────────────────────────────────────────────────────────────────
    console.log('\n⚙️  Seeding Legal Rules...');
    for (const ruleData of RULES) {
      const existing = await LegalRule.findOne({ ruleCode: ruleData.ruleCode });
      if (existing) {
        console.log(`  ⏭  Rule already exists: ${ruleData.ruleCode}`);
      } else {
        const rule = await LegalRule.create(ruleData);
        console.log(`  ✅ Created Rule: ${rule.ruleCode} — ${rule.description.substring(0, 60)}`);
      }
    }

    // ── Users ─────────────────────────────────────────────────────────────────
    console.log('\n👤 Seeding Default Demo Users...');
    const DEFAULT_USERS = [
      {
        name: 'System Admin',
        email: 'admin@nyayasahayak.gov.in',
        password: 'Admin@123456',
        role: 'admin',
        courtName: 'District Collectorate Bihar',
        district: 'Patna',
      },
      {
        name: 'Peshkar Officer',
        email: 'peshkar@nyayasahayak.gov.in',
        password: 'Peshkar@123456',
        role: 'peshkar',
        courtName: 'DM Court Patna',
        district: 'Patna',
      },
      {
        name: 'District Magistrate (DM)',
        email: 'dm@nyayasahayak.gov.in',
        password: 'DM@123456',
        role: 'dm',
        courtName: 'Court of District Magistrate',
        district: 'Patna',
      },
    ];

    for (const userData of DEFAULT_USERS) {
      const existing = await User.findOne({ email: userData.email });
      if (existing) {
        console.log(`  ⏭  User already exists: ${userData.email} (${userData.role})`);
      } else {
        await User.create(userData);
        console.log(`  ✅ Created User: ${userData.email} | Password: ${userData.password} | Role: ${userData.role}`);
      }
    }

    console.log('\n🎉 Seed complete!');
    console.log(`   Users: ${DEFAULT_USERS.length}`);
    console.log(`   Acts: ${Object.keys(actMap).length}`);
    console.log(`   Sections: ${sections.length}`);
    console.log(`   Rules: ${RULES.length}`);
    console.log('\nNote: Section embeddings will be generated on first RAG search call.');


  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
  }
}

seed();
