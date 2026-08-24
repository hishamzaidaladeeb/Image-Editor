from pydantic import BaseModel, Field


class FieldError(BaseModel):
    field: str
    message: str


class ErrorResponse(BaseModel):
    code: str
    message: str
    request_id: str
    retryable: bool = False
    field_errors: list[FieldError] = Field(default_factory=list)
