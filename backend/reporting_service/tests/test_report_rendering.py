from __future__ import annotations

from app.pdf_render import html_to_pdf_bytes
from app.stix_export import build_stix_bundle
from app.templates import DEFAULT_TEMPLATE, render_html


def test_render_html_includes_title() -> None:
    html = render_html(
        DEFAULT_TEMPLATE,
        {
            "title": "Coverage report",
            "workspace_id": "ws-1",
            "generated_at": "2026-05-21T00:00:00Z",
            "summary": "Quarterly coverage",
            "sections": [{"title": "KPI", "body": "OK"}],
        },
    )
    assert "Coverage report" in html
    assert "Quarterly coverage" in html


def test_html_to_pdf_emits_pdf_header() -> None:
    data = html_to_pdf_bytes("<h1>Report</h1><p>Body</p>")
    assert data.startswith(b"%PDF-1.4")
    assert b"Report" in data


def test_stix_bundle_contains_report_object() -> None:
    bundle = build_stix_bundle(
        {
            "workspace_id": "1234",
            "report_type": "coverage",
            "title": "Coverage report",
            "summary": "A summary",
            "technique_stix_ids": ["attack-pattern--abc123", "not-a-stix-id"],
        }
    )
    assert bundle["type"] == "bundle"
    report = [x for x in bundle["objects"] if x["type"] == "report"][0]
    assert report["name"] == "Coverage report"
    assert report["object_refs"] == ["attack-pattern--abc123"]
