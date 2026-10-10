"""Core incident data model."""

from datetime import UTC, datetime
from enum import Enum

from pydantic import AwareDatetime, BaseModel, Field, field_validator


class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IncidentStatus(str, Enum):
    DETECTED = "detected"
    INVESTIGATING = "investigating"
    AWAITING_APPROVAL = "awaiting_approval"
    RECOVERING = "recovering"
    RESOLVED = "resolved"
    FAILED = "failed"
    ESCALATED = "escalated"
    REJECTED = "rejected"


class Incident(BaseModel):
    """An incident with a timezone-aware creation timestamp stored in UTC."""

    incident_id: str
    service_name: str
    severity: Severity
    status: IncidentStatus
    description: str
    created_at: AwareDatetime = Field(default_factory=lambda: datetime.now(UTC))

    @field_validator("created_at")
    @classmethod
    def normalize_created_at(cls, value: datetime) -> datetime:
        return value.astimezone(UTC)
