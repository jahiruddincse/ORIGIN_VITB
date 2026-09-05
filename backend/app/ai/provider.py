import json
import traceback

from app.config import settings
from app.ai.prompts import CLAIM_ANALYSIS_PROMPT, STATE_SUMMARY_PROMPT
from app.services.anomaly_engine import AnomalyEngine


class GeminiProvider:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.is_configured = bool(self.api_key)
        self.model = None

        if self.is_configured:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel('gemini-2.5-flash')
            except Exception:
                # Direct REST fallback will be used
                self.model = None

    def analyze_claim(self, claim_data: dict) -> dict:
        if not self.is_configured:
            return self._fallback_analyze_claim(claim_data)

        # 1. Try google-generativeai package if available
        if self.model:
            try:
                prompt = CLAIM_ANALYSIS_PROMPT.format(claim_data=json.dumps(claim_data, indent=2, default=str))
                response = self.model.generate_content(
                    prompt,
                    generation_config={"response_mime_type": "application/json"}
                )
                result = json.loads(response.text)
                return {
                    "summary": result.get("summary", ""),
                    "why_flagged": result.get("why_flagged", []),
                    "severity_assessment": result.get("severity_assessment", ""),
                    "recommended_action": result.get("recommended_action", ""),
                    "evidence": result.get("evidence", {}),
                    "disclaimer": result.get("disclaimer", "This is an AI-generated assessment for decision support only.")
                }
            except Exception as e:
                print(f"genai package analysis failed: {e}")

        # 2. Try direct REST API with standard library urllib
        try:
            import urllib.request
            import ssl
            ssl_ctx = ssl._create_unverified_context()
            prompt = CLAIM_ANALYSIS_PROMPT.format(claim_data=json.dumps(claim_data, indent=2, default=str))
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={self.api_key}"
            req = urllib.request.Request(
                url,
                data=json.dumps({
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"response_mime_type": "application/json"}
                }).encode('utf-8'),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, context=ssl_ctx, timeout=20) as resp:
                res_json = json.loads(resp.read().decode('utf-8'))
                raw_text = res_json['candidates'][0]['content']['parts'][0]['text'].strip()
                if raw_text.startswith("```json"): raw_text = raw_text[7:]
                if raw_text.startswith("```"): raw_text = raw_text[3:]
                if raw_text.endswith("```"): raw_text = raw_text[:-3]
                result = json.loads(raw_text.strip())
                return {
                    "summary": result.get("summary", ""),
                    "why_flagged": result.get("why_flagged", []),
                    "severity_assessment": result.get("severity_assessment", ""),
                    "recommended_action": result.get("recommended_action", ""),
                    "evidence": result.get("evidence", {}),
                    "disclaimer": result.get("disclaimer", "This is an AI-generated assessment for decision support only.")
                }
        except Exception as e:
            print(f"Gemini REST analysis failed: {e}")

        return self._fallback_analyze_claim(claim_data)

    def generate_state_summary(self, state_data: dict) -> str:
        if not self.is_configured:
            return self._fallback_state_summary(state_data)

        if self.model:
            try:
                prompt = STATE_SUMMARY_PROMPT.format(state_data=json.dumps(state_data, indent=2, default=str))
                response = self.model.generate_content(prompt)
                return response.text
            except Exception as e:
                print(f"AI state summary via genai failed: {e}")

        try:
            import urllib.request
            import ssl
            ssl_ctx = ssl._create_unverified_context()
            prompt = STATE_SUMMARY_PROMPT.format(state_data=json.dumps(state_data, indent=2, default=str))
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={self.api_key}"
            req = urllib.request.Request(
                url,
                data=json.dumps({
                    "contents": [{"parts": [{"text": prompt}]}]
                }).encode('utf-8'),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, context=ssl_ctx, timeout=20) as resp:
                res_json = json.loads(resp.read().decode('utf-8'))
                return res_json['candidates'][0]['content']['parts'][0]['text'].strip()
        except Exception as e:
            print(f"Gemini REST state summary failed: {e}")

        return self._fallback_state_summary(state_data)

    def _fallback_analyze_claim(self, claim_data: dict) -> dict:
        """Deterministic fallback when AI is unavailable."""
        anomaly_types = claim_data.get("anomaly_types", [])
        if isinstance(anomaly_types, str):
            try:
                anomaly_types = json.loads(anomaly_types)
            except:
                anomaly_types = []

        why_flagged = []
        evidence = {}

        for t in anomaly_types:
            desc = AnomalyEngine.get_anomaly_description(t)
            why_flagged.append(desc)

        # Build evidence from claim data
        evidence["Status"] = claim_data.get("status", "Unknown")
        evidence["Days Pending"] = str(claim_data.get("days_pending", "N/A"))
        evidence["Land Record Status"] = claim_data.get("land_record_status", "N/A")
        evidence["Documents Complete"] = "Yes" if claim_data.get("documents_complete") else "No"
        evidence["Area (acres)"] = str(claim_data.get("area_acres", "N/A"))
        evidence["Anomaly Score"] = str(claim_data.get("anomaly_score", 0))

        severity = claim_data.get("severity", "Normal")
        score = claim_data.get("anomaly_score", 0)

        if score >= 60:
            action = "Immediate manual review recommended. Verify land records and ensure all required documentation is submitted before further processing."
        elif score >= 40:
            action = "Prioritized review recommended. Cross-check land records with district office and follow up on pending documentation."
        elif score >= 20:
            action = "Standard review with attention to flagged items. Verify any pending documentation or records."
        else:
            action = "No immediate action required. Claim appears to be within normal parameters."

        summary = (
            f"Claim {claim_data.get('claim_id', 'Unknown')} by {claim_data.get('claimant_name', 'Unknown')} "
            f"for {claim_data.get('area_acres', 0)} acres in {claim_data.get('district', 'Unknown')}, "
            f"{claim_data.get('state', 'Unknown')}. "
        )
        if anomaly_types:
            summary += f"The automated system has identified {len(anomaly_types)} potential issue(s) requiring attention."
        else:
            summary += "No anomalies have been detected by the automated screening system."

        return {
            "summary": summary,
            "why_flagged": why_flagged if why_flagged else ["No specific anomalies detected"],
            "severity_assessment": f"Severity assessed as {severity} with an anomaly score of {score}/100.",
            "recommended_action": action,
            "evidence": evidence,
            "disclaimer": "This is a rule-based assessment generated without AI assistance. It is provided for decision support only and does not constitute a legal opinion."
        }

    def _fallback_state_summary(self, state_data: dict) -> str:
        """Deterministic state summary fallback."""
        state = state_data.get('state', 'Unknown')
        total = state_data.get('total', 0)
        approved = state_data.get('approved', 0)
        pending = state_data.get('pending', 0)
        high_priority = state_data.get('high_priority', 0)
        approval_rate = state_data.get('approval_rate', 0)

        summary = f"**{state}** has processed a total of {total} FRA claims, "
        summary += f"with an approval rate of {approval_rate}%. "
        summary += f"Currently, {pending} claims remain pending review"

        if high_priority > 0:
            summary += f", of which {high_priority} have been classified as high priority and require immediate attention"

        summary += ". "

        if approval_rate < 50:
            summary += "The relatively low approval rate may indicate systematic documentation or verification bottlenecks that warrant administrative review."
        elif pending > approved:
            summary += "The high volume of pending claims suggests a need for additional processing resources or workflow optimization."
        else:
            summary += "Processing appears to be progressing at an acceptable rate."

        return summary
