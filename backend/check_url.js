const mongoose = require('mongoose');
require('dotenv').config();
const Document = require('./src/models/Document');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const doc = await Document.findOne().sort({ createdAt: -1 });
  console.log("Latest doc URL:", doc.cloudinaryUrl);
  console.log("Secure URL:", doc.cloudinarySecureUrl);
  process.exit(0);
}
test();
