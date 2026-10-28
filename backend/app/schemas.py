from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator

Category = Literal["Roads", "Lighting", "Waste", "Parks", "Footpaths", "Other"]
Priority = Literal["Low", "Normal", "High", "Urgent"]
Status = Literal["Submitted", "Under review", "Assigned", "In progress", "Resolved", "Closed"]


class IssueCreate(BaseModel):
    title: str = Field(min_length=5, max_length=120)
    description: str = Field(min_length=10, max_length=3000)
    category: Category
    location: str = Field(min_length=3, max_length=180)
    priority: Priority = "Normal"

    @field_validator("title", "description", "location")
    @classmethod
    def strip_and_reject_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank.")
        return value


class IssueStatusUpdate(BaseModel):
    status: Status
    assigned_team: str | None = Field(default=None, max_length=80)


class IssueRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    category: str
    location: str
    priority: str
    status: str
    assigned_team: str | None
    created_at: datetime
    updated_at: datetime
