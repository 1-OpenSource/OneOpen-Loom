import uuid
from pathlib import Path

from fastapi import UploadFile

from app.core.config import get_settings


class StorageService:
    def __init__(self) -> None:
        self.root = Path(get_settings().uploads_dir).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def save_attachment(self, work_item_key: str, upload: UploadFile) -> tuple[str, int]:
        suffix = Path(upload.filename or "").suffix
        relative_path = Path(work_item_key.lower()) / f"{uuid.uuid4().hex}{suffix}"
        absolute_path = self.root / relative_path
        absolute_path.parent.mkdir(parents=True, exist_ok=True)
        content = upload.file.read()
        absolute_path.write_bytes(content)
        return str(relative_path).replace("\\", "/"), len(content)

    def delete_attachment(self, stored_path: str) -> None:
        absolute_path = (self.root / stored_path).resolve()
        if absolute_path.exists():
            absolute_path.unlink()

    def absolute_path(self, stored_path: str) -> Path:
        return (self.root / stored_path).resolve()
