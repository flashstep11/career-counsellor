from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class DBModelMixin(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={
            datetime: lambda dt: dt.isoformat()
        }
    )
