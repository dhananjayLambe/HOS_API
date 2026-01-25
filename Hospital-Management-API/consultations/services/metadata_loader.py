import json
import os
import threading
from typing import Dict, Any


class MetadataLoader:
    """
    Loads and caches metadata JSON files from templates_metadata directory.
    Thread-safe and production-ready.
    """

    _lock = threading.Lock()
    _cache: Dict[str, Any] = {}

    BASE_PATH = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "templates_metadata"
    )

    @classmethod
    def _load_json(cls, relative_path: str) -> Dict[str, Any]:
        full_path = os.path.join(cls.BASE_PATH, relative_path)

        if not os.path.exists(full_path):
            raise FileNotFoundError(f"Metadata file not found: {full_path}")

        with open(full_path, "r", encoding="utf-8") as f:
            return json.load(f)

    @classmethod
    def get(cls, relative_path: str) -> Dict[str, Any]:
        """
        Public method to fetch metadata.
        Uses in-memory cache to avoid repeated disk reads.
        """
        with cls._lock:
            if relative_path not in cls._cache:
                cls._cache[relative_path] = cls._load_json(relative_path)
            return cls._cache[relative_path]

    @classmethod
    def clear_cache(cls) -> None:
        """
        Clears metadata cache (useful for reloads / admin actions).
        """
        with cls._lock:
            cls._cache.clear()




# Purpose
# 	•	Load JSON metadata from disk
# 	•	Cache it in memory
# 	•	Provide safe access methods
# 	•	Avoid repeated file I/O
# 	•	Ready for future DB/S3 migration