from sqlalchemy import select
from .database import SessionLocal
from .models import Issue

DEMO_ISSUES = [
    dict(title="Streetlight out near community centre", description="The streetlight on the corner has been out for several evenings, making the crossing difficult to see after dark.", category="Lighting", location="Community Centre, Main Street", priority="High", status="Under review", assigned_team="Public Lighting"),
    dict(title="Overflowing public bin in the park", description="The bin beside the northern playground is overflowing and litter is spreading into the grass.", category="Waste", location="North playground, Riverside Park", priority="Normal", status="Assigned", assigned_team="Waste Services"),
    dict(title="Pothole near pedestrian crossing", description="A pothole is forming in the left lane near the marked pedestrian crossing and may be hazardous for cyclists.", category="Roads", location="12 King Street", priority="Urgent", status="In progress", assigned_team="Road Maintenance"),
    dict(title="Broken footpath paving", description="Several paving slabs are uneven and could create a trip hazard for people using mobility aids.", category="Footpaths", location="Outside 40 Garden Avenue", priority="High", status="Submitted", assigned_team=None),
]


def seed_demo_data():
    with SessionLocal() as db:
        if db.scalar(select(Issue.id).limit(1)) is not None:
            return
        db.add_all(Issue(**item) for item in DEMO_ISSUES)
        db.commit()
