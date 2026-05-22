from __future__ import annotations

from app.schemas import ReportJobCreate, ReportScheduleCreate, ReportTemplateCreate


def test_template_create_schema() -> None:
    body = ReportTemplateCreate(name="Default", template_body="<html/>", branding={"logo": "x"})
    assert body.name == "Default"
    assert body.branding["logo"] == "x"


def test_report_job_create_schema() -> None:
    body = ReportJobCreate(report_type="coverage", params={"period_days": 90})
    assert body.report_type == "coverage"
    assert body.params["period_days"] == 90


def test_report_schedule_defaults() -> None:
    body = ReportScheduleCreate(name="Daily", report_type="summary")
    assert body.interval_minutes == 1440
    assert body.enabled is True
