from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


class ApiInfoResponse(BaseModel):
    name: str
    version: str
    environment: str
    api_prefix: str
