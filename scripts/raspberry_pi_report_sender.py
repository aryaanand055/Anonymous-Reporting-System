#!/usr/bin/env python3
"""Send hardware-generated incident reports to the Anonymous Reporting System API.

Usage:
  1) Install dependency: pip install requests
    2) Optionally set REPORT_API_URL (default: http://localhost:9002/api/reports)
    3) Run: python raspberry_pi_report_sender.py
"""

import json
import mimetypes
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Iterable

import requests

HARDWARE_API_KEY = "reporting-system12"
MAX_EVIDENCE_FILES = 3
MAX_EVIDENCE_FILE_SIZE_BYTES = 20 * 1024 * 1024


def build_payload() -> dict:
    # Replace this data with values captured from your Raspberry Pi sensors/mic pipeline.
    return {
        "location": "Chennai",
        "district": "Tinaka",
        "date": datetime.now().strftime("%B %d, %Y"),
        "institution_type": "government hospital",
        "issue_type": "sanitation and cleanliness",
        "severity_level": "high",
        "emotional_indicator": "frustration",
        "raw_text": "Ward B has overflowing bins and persistent foul smell near patient beds."
    }


def get_evidence_files() -> list[Path]:
    raw_paths = os.getenv("EVIDENCE_FILES", "").strip()
    if not raw_paths:
        return [Path(arg) for arg in sys.argv[1:] if arg.strip()]

    return [Path(path.strip()) for path in raw_paths.split(",") if path.strip()]


def build_multipart_files(file_paths: Iterable[Path]):
    multipart_files = []
    for file_path in file_paths:
        if not file_path.exists():
            raise FileNotFoundError(f"Evidence file not found: {file_path}")

        file_size = file_path.stat().st_size
        if file_size > MAX_EVIDENCE_FILE_SIZE_BYTES:
            raise ValueError(f"Evidence file exceeds 20 MB: {file_path}")

        content_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
        multipart_files.append(("evidence", (file_path.name, file_path.open("rb"), content_type)))

    if len(multipart_files) > MAX_EVIDENCE_FILES:
        raise ValueError(f"A maximum of {MAX_EVIDENCE_FILES} evidence files is allowed")

    return multipart_files


def send_report(api_url: str, api_key: str, payload: dict, evidence_files: list[Path]) -> None:
    headers = {
        "X-API-KEY": api_key,
    }

    if evidence_files:
        multipart_files = build_multipart_files(evidence_files)
        try:
            response = requests.post(api_url, headers=headers, data=payload, files=multipart_files, timeout=15)
        finally:
            for _, (_, file_handle, _) in multipart_files:
                file_handle.close()
    else:
        headers["Content-Type"] = "application/json"
        response = requests.post(api_url, headers=headers, json=payload, timeout=15)

    print(f"Status: {response.status_code}")
    try:
        print("Response:")
        print(json.dumps(response.json(), indent=2))
    except ValueError:
        print(response.text)

    response.raise_for_status()


def main() -> int:
    api_url = os.getenv("REPORT_API_URL", "https://anonymous-reporting-system-eight.vercel.app/api/reports")
    api_key = HARDWARE_API_KEY

    payload = build_payload()
    evidence_files = get_evidence_files()

    try:
        send_report(api_url, api_key, payload, evidence_files)
        return 0
    except requests.RequestException as exc:
        print(f"Request failed: {exc}")
    except (FileNotFoundError, ValueError) as exc:
        print(f"Invalid evidence file configuration: {exc}")
        return 2


if __name__ == "__main__":
    sys.exit(main())
