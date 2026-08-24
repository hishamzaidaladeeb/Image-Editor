from pathlib import Path
from uuid import UUID, uuid4


class SafeTemporaryStorage:
    def __init__(self, directory: str) -> None:
        self.directory = Path(directory)
        self.directory.mkdir(parents=True, exist_ok=True)
        self._assets: dict[str, Path] = {}
        self._previews: set[str] = set()
        self._exports: dict[str, Path] = {}
        self._export_names: dict[str, str] = {}
        self._export_types: dict[str, str] = {}
        self._export_previews: set[str] = set()

    def save(self, data: bytes, extension: str, preview: bool = False) -> tuple[str, Path]:
        asset_id = str(uuid4())
        path = self.directory / f"{asset_id}{extension}"
        path.write_bytes(data)
        self._assets[asset_id] = path
        if preview:
            self._previews.add(asset_id)
        return asset_id, path

    def get(self, asset_id: str) -> Path | None:
        try:
            UUID(asset_id)
        except ValueError:
            return None
        path = self._assets.get(asset_id)
        if path is None or not path.is_file() or path.parent != self.directory:
            return None
        return path

    def delete_preview(self, asset_id: str) -> bool:
        if asset_id not in self._previews:
            return False
        path = self._assets.pop(asset_id, None)
        self._previews.discard(asset_id)
        if path is None:
            return False
        path.unlink(missing_ok=True)
        return True

    def save_export(self, data: bytes, extension: str, filename: str, media_type: str, preview: bool = False) -> tuple[str, Path]:
        export_id = str(uuid4())
        path = self.directory / f"export-{export_id}{extension}"
        path.write_bytes(data)
        self._exports[export_id] = path
        self._export_names[export_id] = filename
        self._export_types[export_id] = media_type
        if preview:
            self._export_previews.add(export_id)
        return export_id, path

    def get_export(self, export_id: str) -> Path | None:
        try:
            UUID(export_id)
        except ValueError:
            return None
        path = self._exports.get(export_id)
        if path is None or not path.is_file() or path.parent != self.directory:
            return None
        return path

    def delete_export_preview(self, export_id: str) -> bool:
        if export_id not in self._export_previews:
            return False
        path = self._exports.pop(export_id, None)
        self._export_names.pop(export_id, None)
        self._export_types.pop(export_id, None)
        self._export_previews.discard(export_id)
        if path is None:
            return False
        path.unlink(missing_ok=True)
        return True

    def export_filename(self, export_id: str) -> str | None:
        if self.get_export(export_id) is None:
            return None
        return self._export_names.get(export_id)

    def export_media_type(self, export_id: str) -> str | None:
        if self.get_export(export_id) is None:
            return None
        return self._export_types.get(export_id)

    def is_export_preview(self, export_id: str) -> bool:
        return export_id in self._export_previews

    def export_preview_count(self) -> int:
        return len(self._export_previews)

    def is_asset_preview(self, asset_id: str) -> bool:
        return asset_id in self._previews

    def is_preview(self, asset_id: str) -> bool:
        return asset_id in self._previews

    def preview_count(self) -> int:
        return len(self._previews)
