import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import mongoose from "mongoose";
import { analyzeReportDepartments } from "../src/lib/report-routing";

// Mocking required for running in Node environment without full Next.js context
// We need to point to the actual model or a simplified version of it
const ReportSchema = new mongoose.Schema({
  title: String,
  description: String,
  location: String,
  issueType: String,
  rawText: String,
  institutionType: String,
  severityLevel: String,
  department: String,
  departments: [String],
}, { timestamps: true });

const Report = mongoose.models.Report || mongoose.model("Report", ReportSchema);

async function backfillRouting() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI is not set in .env.local");
    process.exit(1);
  }

  console.log("🔗 Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected\n");

  const reports = await Report.find({});
  console.log(`📋 Processing ${reports.length} reports...\n`);

  for (const report of reports) {
    process.stdout.write(`🔍 [${report._id}] Routing "${report.title || report.issueType}"... `);
    
    try {
      const routing = await analyzeReportDepartments({
        title: report.title,
        description: report.description,
        location: report.location,
        issueType: report.issueType,
        rawText: report.rawText,
        institutionType: report.institutionType,
        severityLevel: report.severityLevel,
      });

      await Report.findByIdAndUpdate(report._id, {
        department: routing.primaryDepartment,
        departments: routing.departments
      });

      console.log(`✅ -> ${routing.primaryDepartment} (${routing.departments.join(", ")})`);
    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
    }
  }

  console.log("\n✅ Done! All reports have been routed.");
  await mongoose.disconnect();
}

backfillRouting();
