const http = require('http');

async function testApi() {
  console.log("Testing local API...");
  try {
    const res = await fetch("http://localhost:3000/api/reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": "reporting-system12"
      },
      body: JSON.stringify({
        trackingId: "AR-TESTING-123",
        raw_text: "This is a test report for tracking ID validation."
      })
    });
    
    console.log("Status:", res.status);
    const json = await res.json();
    console.log("Response:", json);
  } catch (err) {
    console.error("Error:", err);
  }
}

testApi();
