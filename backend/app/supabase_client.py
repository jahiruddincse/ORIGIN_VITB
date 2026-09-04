"""
VanRaksha AI — Supabase Client & Data Access Layer
Integrates Supabase PostgreSQL as primary database while maintaining zero-downtime
SQLite fallback with deterministic anomaly evaluation.
"""

import os
import json
import ssl
import urllib.request
import urllib.parse
from typing import Dict, List, Optional, Any

# Environment variables
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = (
    os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
    or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    or ""
)

SSL_CTX = ssl._create_unverified_context()

class SupabaseService:
    @classmethod
    def is_configured(cls) -> bool:
        return bool(SUPABASE_URL and SUPABASE_KEY)

    @classmethod
    def get_status(cls, fallback_count: int = 750) -> Dict[str, Any]:
        if not SUPABASE_URL:
            return {
                "source": "sqlite_fallback",
                "supabase_configured": False,
                "status": "unconfigured",
                "message": "NEXT_PUBLIC_SUPABASE_URL is not set",
                "claims_count": fallback_count
            }
        
        if not SUPABASE_KEY:
            return {
                "source": "sqlite_fallback",
                "supabase_configured": False,
                "supabase_url": SUPABASE_URL,
                "status": "awaiting_key",
                "message": "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is pending in .env.local",
                "claims_count": fallback_count
            }

        # Try a ping count query
        try:
            url = f"{SUPABASE_URL}/rest/v1/claims?select=count"
            headers = {
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Range": "0-0",
                "Prefer": "count=exact"
            }
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, context=SSL_CTX, timeout=5) as resp:
                crange = resp.headers.get("Content-Range", "")
                total = int(crange.split("/")[-1]) if "/" in crange else 0
                return {
                    "source": "supabase",
                    "supabase_configured": True,
                    "supabase_url": SUPABASE_URL,
                    "status": "connected",
                    "claims_count": total,
                    "message": f"Supabase Live — {total} claims synced"
                }
        except Exception as e:
            return {
                "source": "sqlite_fallback",
                "supabase_configured": True,
                "supabase_url": SUPABASE_URL,
                "status": "fallback_active",
                "message": f"Supabase query failed ({e}); serving local fallback data",
                "claims_count": fallback_count
            }

    @classmethod
    def fetch_claims(
        cls,
        state: Optional[str] = None,
        district: Optional[str] = None,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        anomaly_type: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 1000,
        offset: int = 0
    ) -> Optional[Dict[str, Any]]:
        """Fetch claims directly from Supabase via PostgREST."""
        if not cls.is_configured():
            return None

        query_params = ["select=*"]
        if state:
            query_params.append(f"state=eq.{urllib.parse.quote(state)}")
        if district:
            query_params.append(f"district=eq.{urllib.parse.quote(district)}")
        if status:
            query_params.append(f"status=eq.{urllib.parse.quote(status)}")
        if severity:
            query_params.append(f"severity=eq.{urllib.parse.quote(severity)}")
        if anomaly_type:
            # Check JSON array
            query_params.append(f"anomaly_types=cs.[\"{urllib.parse.quote(anomaly_type)}\"]")
        if search:
            escaped = urllib.parse.quote(f"*{search}*")
            query_params.append(f"or=(claimant_name.ilike.{escaped},claim_id.ilike.{escaped},district.ilike.{escaped})")

        # Sort by anomaly_score desc, submission_date desc
        query_params.append("order=anomaly_score.desc,submission_date.desc")
        query_params.append(f"limit={limit}")
        query_params.append(f"offset={offset}")

        url = f"{SUPABASE_URL}/rest/v1/claims?{'&'.join(query_params)}"
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Prefer": "count=exact"
        }

        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, context=SSL_CTX, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                crange = resp.headers.get("Content-Range", "")
                total = int(crange.split("/")[-1]) if "/" in crange and crange.split("/")[-1] != "*" else len(data)

                # Validate coordinates and ensure clean data
                cleaned = []
                for row in data:
                    try:
                        row["latitude"] = float(row.get("latitude", 0.0))
                        row["longitude"] = float(row.get("longitude", 0.0))
                        row["area_acres"] = float(row.get("area_acres") or row.get("claimed_area") or 0.0)
                        if isinstance(row.get("anomaly_types"), str):
                            try:
                                row["anomaly_types"] = json.loads(row["anomaly_types"])
                            except Exception:
                                row["anomaly_types"] = []
                        cleaned.append(row)
                    except Exception:
                        continue

                return {
                    "total": total,
                    "data": cleaned,
                    "page": (offset // limit) + 1 if limit > 0 else 1,
                    "limit": limit,
                    "pages": (total + limit - 1) // limit if total > 0 and limit > 0 else 1
                }
        except Exception as e:
            print(f"Supabase fetch_claims error: {e}")
            return None

    @classmethod
    def fetch_claim_by_id(cls, claim_id: str) -> Optional[Dict[str, Any]]:
        """Fetch a single claim by claim_id from Supabase."""
        if not cls.is_configured():
            return None

        url = f"{SUPABASE_URL}/rest/v1/claims?claim_id=eq.{urllib.parse.quote(claim_id)}&select=*"
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        }

        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, context=SSL_CTX, timeout=8) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if data and len(data) > 0:
                    row = data[0]
                    if isinstance(row.get("anomaly_types"), str):
                        try:
                            row["anomaly_types"] = json.loads(row["anomaly_types"])
                        except Exception:
                            row["anomaly_types"] = []
                    return row
                return None
        except Exception as e:
            print(f"Supabase fetch_claim_by_id error: {e}")
            return None

    @classmethod
    def record_disposition(
        cls,
        claim_id: str,
        action_type: str,
        officer_name: str,
        officer_designation: str,
        remarks: str,
        notice_ref_no: str
    ) -> bool:
        """Insert official disposition event into claim_dispositions table."""
        if not cls.is_configured():
            return False

        url = f"{SUPABASE_URL}/rest/v1/claim_dispositions"
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }
        payload = {
            "claim_id": claim_id,
            "action_type": action_type,
            "officer_name": officer_name,
            "officer_designation": officer_designation,
            "remarks": remarks,
            "notice_ref_no": notice_ref_no
        }

        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST"
            )
            with urllib.request.urlopen(req, context=SSL_CTX, timeout=8) as resp:
                return resp.status in (200, 201)
        except Exception as e:
            print(f"Supabase record_disposition error: {e}")
            return False

    @classmethod
    def fetch_benchmarks(cls, state: Optional[str] = None) -> Optional[List[Dict[str, Any]]]:
        """Fetch official MoTA aggregate benchmarks from Supabase if available."""
        if not cls.is_configured():
            return None

        url = f"{SUPABASE_URL}/rest/v1/fra_official_benchmarks?select=*"
        if state:
            url += f"&state=eq.{urllib.parse.quote(state)}"
        else:
            url += "&order=claims_received_total.desc"

        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        }

        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, context=SSL_CTX, timeout=8) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data
        except Exception as e:
            print(f"Supabase fetch_benchmarks error (will use SQLite fallback): {e}")
            return None
