"""Validation and timestamp behavior for incidents."""

from datetime import UTC, datetime, timedelta, timezone

import pytest
from pydantic import ValidationError

from backend.app.models import Incident, IncidentStatus, Severity


@pytest.fixture
def incident_data() -> dict[str, str]:
    return {
        "incident_id": "incident-001",
        "service_name": "payments",
        "severity": "high",
        "status": "detected",
        "description": "Elevated error rate",
    }


@pytest.mark.parametrize("severity", ["low", "medium", "high", "critical"])
@pytest.mark.parametrize(
    "status",
    ["detected", "investigating", "awaiting_approval", "recovering", "resolved", "failed"],
)
def test_valid_incident(
    incident_data: dict[str, str], severity: str, status: str
) -> None:
    incident_data.update(severity=severity, status=status)
    incident = Incident(**incident_data)

    assert incident.incident_id == incident_data["incident_id"]
    assert incident.service_name == incident_data["service_name"]
    assert incident.description == incident_data["description"]
    assert incident.severity is Severity(severity)
    assert incident.status is IncidentStatus(status)
    assert incident.model_dump(mode="json")["severity"] == severity
    assert incident.model_dump(mode="json")["status"] == status


@pytest.mark.parametrize("field", ["severity", "status"])
@pytest.mark.parametrize("value", ["unknown", "HIGH", ""])
def test_invalid_enum_value(
    incident_data: dict[str, str], field: str, value: str
) -> None:
    incident_data[field] = value

    with pytest.raises(ValidationError) as exc_info:
        Incident(**incident_data)

    assert exc_info.value.errors()[0]["loc"] == (field,)
    assert exc_info.value.errors()[0]["type"] == "enum"


def test_created_at_defaults_to_current_utc(incident_data: dict[str, str]) -> None:
    for _ in range(2):
        before = datetime.now(UTC)
        incident = Incident(**incident_data)
        after = datetime.now(UTC)

        assert before <= incident.created_at <= after
        assert incident.created_at.tzinfo is UTC


@pytest.mark.parametrize(
    "created_at",
    [
        datetime(2026, 10, 10, 12, tzinfo=UTC),
        datetime(2026, 10, 10, 17, 30, tzinfo=timezone(timedelta(hours=5, minutes=30))),
        "2026-10-10T08:00:00-04:00",
        "2026-10-10T12:00:00Z",
    ],
)
def test_created_at_is_normalized_to_utc(
    incident_data: dict[str, str], created_at: datetime | str
) -> None:
    incident = Incident(**incident_data, created_at=created_at)

    assert incident.created_at == datetime(2026, 10, 10, 12, tzinfo=UTC)
    assert incident.created_at.tzinfo is UTC
    assert Incident.model_validate_json(incident.model_dump_json()) == incident


@pytest.mark.parametrize(
    "created_at", [datetime(2026, 10, 10, 12), "2026-10-10T12:00:00"]
)
def test_created_at_rejects_naive_timestamps(
    incident_data: dict[str, str], created_at: datetime | str
) -> None:
    with pytest.raises(ValidationError) as exc_info:
        Incident(**incident_data, created_at=created_at)

    assert exc_info.value.errors()[0]["loc"] == ("created_at",)
    assert exc_info.value.errors()[0]["type"] == "timezone_aware"
