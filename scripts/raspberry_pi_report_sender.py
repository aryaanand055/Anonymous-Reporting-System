#!/usr/bin/env python3
"""Send hardware-generated incident reports to the Anonymous Reporting System API.

Usage:
  1) Install dependency: pip install requests
  2) Set env vars:
     - REPORT_API_URL (default: http://localhost:9002/api/reports)
     - HARDWARE_API_KEY (required)
  3) Run: python raspberry_pi_report_sender.py
"""

import json
import os
import sys
from datetime import datetime

import requests


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
        "raw_text": "Ward B has overflowing bins and persistent foul smell near patient beds.",
    }


def send_report(api_url: str, api_key: str, payload: dict) -> None:
    headers = {
        "Content-Type": "application/json",
        "X-API-KEY": api_key,
    }

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
    api_key = os.getenv("HARDWARE_API_KEY")

    if not api_key:
        print("Error: HARDWARE_API_KEY environment variable is not set.")
        return 1

    payload = build_payload()

    try:
        send_report(api_url, api_key, payload)
        return 0
    except requests.RequestException as exc:
        print(f"Request failed: {exc}")
        return 2


if __name__ == "__main__":
    sys.exit(main())
