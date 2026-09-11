require('dotenv').config();

async function testFetch() {
  // Try to fetch the document from Cloudinary
  const documentUrl = 'https://res.cloudinary.com/ddslmx5qa/image/upload/v1788443205/nyayasahayak/documents/vu9wcoyv6tzwup6vlahl.pdf';
  try {
    const fetchResponse = await fetch(documentUrl);
    console.log("Status:", fetchResponse.status);
    console.log("Content-Type:", fetchResponse.headers.get('content-type'));
    const buffer = await fetchResponse.arrayBuffer();
    console.log("Size:", buffer.byteLength, "bytes");
    
    if (fetchResponse.status === 200) {
      console.log("SUCCESS! Cloudinary is now allowing the PDF download.");
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}
testFetch();
testFetch();
