# Anonymous Reporting System API Documentation

## Overview

The Anonymous Reporting System API accepts incident reports from hardware devices via HTTP POST requests. Reports can be submitted as JSON (text only) or multipart form data (with evidence files). All requests require authentication via the `X-API-KEY` header.

**Key Feature**: Reports can be **encrypted end-to-end** using the API key (AES-256-GCM), ensuring anonymity even if intercepted. Encryption is enabled by default.

**Base URL**: `https://anonymous-reporting-system-eight.vercel.app`

## Security & Encryption

By default, all report payloads are encrypted using **AES-256-GCM** with a key derived from your `X-API-KEY`. This ensures:
- **Confidentiality**: Even if network traffic is intercepted, the report data remains encrypted
- **Authenticity**: GCM mode provides authenticated encryption, preventing tampering
- **Anonymity**: No identifiable information is transmitted in plaintext

### How Encryption Works

1. The API key is used to derive a 256-bit encryption key via PBKDF2-SHA256
2. Your report JSON is encrypted using AES-256-GCM with a random IV
3. The encrypted payload is sent in an `encrypted` field containing `{iv, data, tag}`
4. The server decrypts using the same API key

### Disabling Encryption (Not Recommended)

To send unencrypted reports (for development/testing only):

```bash
export ENCRYPT_PAYLOAD=false
python raspberry_pi_report_sender.py
```

## Authentication

All API requests require the following header:

```
X-API-KEY: <HARDWARE_API_KEY>
```

The API key must match the value configured in the `HARDWARE_API_KEY` environment variable on the server.

---

## Endpoints

### 1. Submit a Report

**Endpoint**: `POST /api/reports`

Accepts incident reports in two formats: JSON (text-only) or multipart form data (with evidence files).

#### Request Format: JSON (Text Only)

**Content-Type**: `application/json`

**Encrypted (Default)**:

```json
{
  "encrypted": {
    "iv": "base64-encoded-iv",
    "data": "base64-encoded-encrypted-data",
    "tag": "base64-encoded-auth-tag"
  }
}
```

**Unencrypted (for development only)**:

```json
{
  "location": "Chennai",
  "district": "Tinaka",
  "date": "April 18, 2026",
  "institution_type": "government hospital",
  "issue_type": "sanitation and cleanliness",
  "severity_level": "high",
  "emotional_indicator": "frustration",
  "raw_text": "Ward B has overflowing bins and persistent foul smell near patient beds."
}
```

**Required Fields**:
- `location` (string): Physical location where the incident occurred
- `district` (string): District or region identifier
- `date` (string): Date label (e.g., "April 18, 2026")
- `institution_type` (string): Type of institution (e.g., "government hospital", "school")
- `issue_type` (string): Category of the issue (e.g., "sanitation and cleanliness", "fire safety")
- `severity_level` (string): One of `low`, `medium`, `high`
- `emotional_indicator` (string): Emotional context (e.g., "frustration", "concern", "anger")

**Optional Fields**:
- `raw_text` or `rawText` (string): Additional freeform description

#### Request Format: Multipart Form Data (With Evidence)

**Content-Type**: `multipart/form-data`

**Encrypted (Default)** - Send encrypted form fields plus evidence files:

```bash
curl -X POST "https://anonymous-reporting-system-eight.vercel.app/api/reports" \
  -H "X-API-KEY: reporting-system12" \
  -F 'encrypted={"iv":"base64-iv","data":"base64-data","tag":"base64-tag"}' \
  -F "evidence=@/path/to/photo.jpg" \
  -F "evidence=@/path/to/audio.wav"
```

**Unencrypted (for development only)** - Send form fields directly:

```bash
curl -X POST "https://anonymous-reporting-system-eight.vercel.app/api/reports" \
  -H "X-API-KEY: reporting-system12" \
  -F "location=Chennai" \
  -F "district=Tinaka" \
  -F "date=April 18, 2026" \
  -F "institution_type=government hospital" \
  -F "issue_type=sanitation and cleanliness" \
  -F "severity_level=high" \
  -F "emotional_indicator=frustration" \
  -F "raw_text=Ward B has overflowing bins." \
  -F "evidence=@/path/to/photo.jpg" \
  -F "evidence=@/path/to/audio.wav"
```

**Evidence Constraints**:
- Maximum **3 files** per report
- Each file must be **20 MB or smaller**
- File type is unrestricted (images, audio, video, documents, etc.)

#### Response: Success (201)

```json
{
  "success": true,
  "message": "Report received successfully",
  "id": "507f1f77bcf86cd799439011",
  "trackingId": "AR-ABC3XY7Z"
}
```

#### Response: Validation Error (400)

```json
{
  "error": "A maximum of 3 evidence files is allowed"
}
```

or

```json
{
  "error": "Each evidence file must be 20 MB or smaller: photo.jpg"
}
```

#### Response: Unauthorized (401)

```json
{
  "error": "Unauthorized"
}
```

#### Response: Server Error (500)

```json
{
  "error": "Internal Server Error"
}
```

---

### 2. Upload Evidence to Existing Report

**Endpoint**: `POST /api/reports/:reportRef/evidence`

Attach additional evidence files to an already-created report. Validates ownership via tracking ID match.

**URL Parameters**:
- `reportRef` (required): Either:
  - MongoDB report ID (returned as `id` from API responses), or
  - Tracking ID (e.g., `AR-ABC3XY7Z`) for direct attachment flows

**Request Headers**:
- `X-API-KEY`: Required for authentication
- `Content-Type`: `multipart/form-data`

**Request Body**:
- `trackingId` (optional when `reportRef` is a tracking ID): The tracking ID of the report (e.g., `AR-ABC3XY7Z`)
- `evidence` (required, 1-3 files): Evidence files to attach

```bash
curl -X POST "https://anonymous-reporting-system-eight.vercel.app/api/reports/507f1f77bcf86cd799439011/evidence" \
  -H "X-API-KEY: reporting-system12" \
  -F "trackingId=AR-ABC3XY7Z" \
  -F "evidence=@/path/to/additional_photo.jpg" \
  -F "evidence=@/path/to/additional_document.pdf"
```

Direct via tracking ID in URL:

```bash
curl -X POST "https://anonymous-reporting-system-eight.vercel.app/api/reports/AR-ABC3XY7Z/evidence" \
  -H "X-API-KEY: reporting-system12" \
  -F "evidence=@/path/to/additional_photo.jpg"
```

#### Evidence Constraints

- Minimum **1 file** per request
- Total evidence files per report: maximum **3 files**
- Each file must be **20 MB or smaller**
- File type is unrestricted

#### Response: Success (200)

```json
{
  "success": true,
  "message": "Evidence attached successfully",
  "filesAdded": 2
}
```

#### Response: Validation Errors (400)

Missing tracking ID:

```json
{
  "error": "trackingId is required"
}
```

No evidence files provided:

```json
{
  "error": "At least one evidence file is required"
}
```

Exceeds file limit:

```json
{
  "error": "Total evidence files cannot exceed 3. Current: 2, attempting to add: 2"
}
```

File too large:

```json
{
  "error": "Each evidence file must be 20 MB or smaller: large_video.mp4"
}
```

#### Response: Ownership Mismatch (403)

```json
{
  "error": "Tracking ID does not match report"
}
```

#### Response: Not Found (404)

```json
{
  "error": "Report not found"
}
```

#### Response: Unauthorized (401)

```json
{
  "error": "Unauthorized"
}
```

---

### 3. Check Report Status

**Endpoint**: `GET /api/reports`

Query the status of a submitted report using its tracking ID.

**Query Parameters**:
- `trackingId` (required): The tracking ID returned in the submission response (e.g., `AR-ABC3XY7Z`)

#### Example Request

```bash
curl -X GET "https://anonymous-reporting-system-eight.vercel.app/api/reports?trackingId=AR-ABC3XY7Z"
```

#### Response: Success (200)

```json
{
  "success": true,
  "report": {
    "trackingId": "AR-ABC3XY7Z",
    "status": "pending",
    "issueType": "sanitation and cleanliness",
    "location": "Chennai",
    "createdAt": "2026-04-18T10:30:00.000Z"
  }
}
```

**Possible Status Values**:
- `pending`: Report received, awaiting review
- `in_progress`: Report under investigation or action
- `resolved`: Report has been addressed

#### Response: Not Found (404)

```json
{
  "error": "Report not found"
}
```

---

### 4. Download Evidence File

**Endpoint**: `GET /api/reports/download`

Download a specific evidence file attached to a report.

**Query Parameters**:
- `trackingId` (required): The report's tracking ID
- `fileId` (required): The file ID from the evidence metadata

**Authentication**: Requires `X-API-KEY` header

#### Example Request

```bash
curl -X GET "https://anonymous-reporting-system-eight.vercel.app/api/reports/download?trackingId=AR-ABC3XY7Z&fileId=507f1f77bcf86cd799439012" \
  -H "X-API-KEY: reporting-system12" \
  -o evidence.jpg
```

#### Response: Success (200)

Returns the binary file content with appropriate `Content-Type` and `Content-Disposition` headers.

```
Content-Type: image/jpeg
Content-Disposition: attachment; filename*=UTF-8''evidence.jpg
```

#### Response: Not Found (404)

```json
{
  "error": "Report evidence not found"
}
```

#### Response: Unauthorized (401)

```json
{
  "error": "Unauthorized"
}
```

---

## Severity Levels and Department Routing

The API automatically routes reports to the appropriate department based on the `issue_type`:

**Fire Department Routes**:
- Keywords: fire, smoke, burn, explosion, electrical

**Human Rights Department Routes**:
- All other issue types

---

## Python Example: Using the Raspberry Pi Sender

The project includes a ready-to-use Python script at `scripts/raspberry_pi_report_sender.py`.

**Requirements**: `pip install requests cryptography`

### Encrypted Submission (Default, Recommended)

```bash
python raspberry_pi_report_sender.py
```

or with evidence files:

```bash
python raspberry_pi_report_sender.py /path/to/photo.jpg /path/to/audio.wav
```

or via environment variable:

```bash
export EVIDENCE_FILES=/path/to/photo.jpg,/path/to/audio.wav
python raspberry_pi_report_sender.py
```

### Unencrypted Submission (Development Only)

To disable encryption for testing:

```bash
export ENCRYPT_PAYLOAD=false
python raspberry_pi_report_sender.py
```

**Note**: Encryption is enabled by default and should not be disabled in production.

### Custom API URL

```bash
export REPORT_API_URL=http://localhost:9002/api/reports
python raspberry_pi_report_sender.py
```

---

## Error Handling

| HTTP Status | Scenario | Example Response |
|---|---|---|
| 200/201 | Success | `{"success": true, ...}` |
| 400 | Validation error (missing/invalid field, too many files, file too large) | `{"error": "A maximum of 3 evidence files is allowed"}` |
| 401 | Missing or incorrect API key | `{"error": "Unauthorized"}` |
| 404 | Report or evidence not found | `{"error": "Report evidence not found"}` |
| 500 | Server error | `{"error": "Internal Server Error"}` |

---

## Rate Limiting

No explicit rate limiting is currently enforced. However, best practices suggest submitting reports as they occur rather than in rapid bursts.

---

## Data Privacy

- All evidence files are stored privately in MongoDB GridFS and are only accessible via authenticated API requests.
- Reports are indexed by tracking ID for anonymous retrieval; no user identity is required or stored.
- Evidence metadata (filename, size, content type, upload time) is persisted alongside report data.

---

## Workflow Example

1. **Submit Report with Evidence**:
   ```bash
   curl -X POST "https://anonymous-reporting-system-eight.vercel.app/api/reports" \
     -H "X-API-KEY: reporting-system12" \
     -F "location=Mumbai" \
     -F "district=Central" \
     -F "date=April 18, 2026" \
     -F "institution_type=school" \
     -F "issue_type=water quality" \
     -F "severity_level=medium" \
     -F "emotional_indicator=concern" \
     -F "raw_text=Water from the drinking fountain is discolored." \
     -F "evidence=@water_sample.jpg"
   ```

   **Response**:
   ```json
   {
     "success": true,
     "message": "Report received successfully",
     "trackingId": "AR-XYZ1ABC2"
   }
   ```

2. **Check Status**:
   ```bash
   curl "https://anonymous-reporting-system-eight.vercel.app/api/reports?trackingId=AR-XYZ1ABC2"
   ```

   **Response**:
   ```json
   {
     "success": true,
     "report": {
       "trackingId": "AR-XYZ1ABC2",
       "status": "in_progress",
       "issueType": "water quality",
       "location": "Mumbai",
       "createdAt": "2026-04-18T14:22:00.000Z"
     }
   }
   ```

2. **Attach Additional Evidence**:
   ```bash
   curl -X POST "https://anonymous-reporting-system-eight.vercel.app/api/reports/507f1f77bcf86cd799439011/evidence" \
     -H "X-API-KEY: reporting-system12" \
     -F "trackingId=AR-XYZ1ABC2" \
     -F "evidence=@follow_up_photo.jpg" \
     -F "evidence=@lab_report.pdf"
   ```

   **Response**:
   ```json
   {
     "success": true,
     "message": "Evidence attached successfully",
     "filesAdded": 2
   }
   ```

3. **Download Evidence** (if fileId was stored):
   ```bash
   curl "https://anonymous-reporting-system-eight.vercel.app/api/reports/download?trackingId=AR-XYZ1ABC2&fileId=507f1f77bcf86cd799439012" \
     -H "X-API-KEY: reporting-system12" \
     -o water_sample.jpg
   ```

---

## Environment Variables

Configure these on the server:

- `HARDWARE_API_KEY`: The API key that all requests must provide (default: `reporting-system12` in development)
- `MONGODB_URI`: MongoDB connection string for storing reports and GridFS evidence
- `REPORT_API_URL`: (Client-side only) URL for the Pi sender to POST to

---

## Support

For issues or questions, refer to the project README or the submit page at `https://anonymous-reporting-system-eight.vercel.app/submit`.
