from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class HealthService:
    service_name: str
    version: str

    def status(self) -> dict[str, str]:
        return {"status": "ok", "service": self.service_name, "version": self.version}


class TemporaryStorage:
    def __init__(self, directory: str) -> None:
        self.directory = Path(directory)

    def location(self) -> Path:
        return self.directory
