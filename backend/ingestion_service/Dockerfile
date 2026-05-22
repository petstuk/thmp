FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

COPY backend/thmp_common /app/thmp_common
COPY backend/thmp_cdk /app/thmp_cdk

COPY connectors/example_webhook /app/connectors/example_webhook
COPY connectors/elastic_scm /app/connectors/elastic_scm
COPY connectors/stix_taxii /app/connectors/stix_taxii
COPY connectors/misp /app/connectors/misp
COPY connectors/opencti /app/connectors/opencti
COPY connectors/splunk /app/connectors/splunk
COPY connectors/sentinel /app/connectors/sentinel
COPY connectors/elastic_siem /app/connectors/elastic_siem
COPY connectors/qradar /app/connectors/qradar
COPY connectors/tenable /app/connectors/tenable
COPY connectors/qualys /app/connectors/qualys
COPY connectors/xsoar /app/connectors/xsoar
COPY connectors/splunk_soar /app/connectors/splunk_soar
COPY connectors/jira /app/connectors/jira
COPY connectors/servicenow /app/connectors/servicenow
COPY connectors/slack /app/connectors/slack
COPY connectors/teams /app/connectors/teams
COPY connectors/pagerduty /app/connectors/pagerduty
COPY connectors/email_notify /app/connectors/email_notify

COPY backend/ingestion_service /app/ingestion_service

RUN pip install --no-cache-dir \
    -e /app/thmp_common \
    -e /app/thmp_cdk \
    -e /app/connectors/example_webhook \
    -e /app/connectors/elastic_scm \
    -e /app/connectors/stix_taxii \
    -e /app/connectors/misp \
    -e /app/connectors/opencti \
    -e /app/connectors/splunk \
    -e /app/connectors/sentinel \
    -e /app/connectors/elastic_siem \
    -e /app/connectors/qradar \
    -e /app/connectors/tenable \
    -e /app/connectors/qualys \
    -e /app/connectors/xsoar \
    -e /app/connectors/splunk_soar \
    -e /app/connectors/jira \
    -e /app/connectors/servicenow \
    -e /app/connectors/slack \
    -e /app/connectors/teams \
    -e /app/connectors/pagerduty \
    -e /app/connectors/email_notify \
    -e /app/ingestion_service

ENV PYTHONPATH=/app/ingestion_service
WORKDIR /app/ingestion_service
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
