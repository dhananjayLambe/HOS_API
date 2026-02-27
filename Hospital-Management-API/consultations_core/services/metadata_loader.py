import json
import os
import threading
from typing import Dict, Any, Tuple


class MetadataLoader:
    """
    Loads and caches metadata JSON files from templates_metadata directory.
    Thread-safe and production-ready.
    Automatically detects file changes and reloads when files are modified.
    """

    _lock = threading.Lock()
    _cache: Dict[str, Tuple[Dict[str, Any], float]] = {}  # Stores (data, mtime) tuples

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
    def _get_file_mtime(cls, relative_path: str) -> float:
        """Get file modification time."""
        full_path = os.path.join(cls.BASE_PATH, relative_path)
        if not os.path.exists(full_path):
            return 0.0
        return os.path.getmtime(full_path)

    @classmethod
    def get(cls, relative_path: str, force_reload: bool = False) -> Dict[str, Any]:
        """
        Public method to fetch metadata.
        Uses in-memory cache but checks file modification time.
        Automatically reloads if file has changed since last load.
        
        Args:
            relative_path: Path to JSON file relative to templates_metadata/
            force_reload: If True, bypasses cache and reloads from disk
        """
        with cls._lock:
            current_mtime = cls._get_file_mtime(relative_path)
            
            # Check if we need to reload
            if force_reload:
                # Force reload - clear cache entry
                if relative_path in cls._cache:
                    del cls._cache[relative_path]
            elif relative_path in cls._cache:
                # Check if file has been modified
                cached_data, cached_mtime = cls._cache[relative_path]
                if current_mtime > cached_mtime:
                    # File has been modified, reload it
                    if relative_path in cls._cache:
                        del cls._cache[relative_path]
            
            # Load if not in cache or was cleared
            if relative_path not in cls._cache:
                data = cls._load_json(relative_path)
                cls._cache[relative_path] = (data, current_mtime)
            
            # Return cached data
            return cls._cache[relative_path][0]

    @classmethod
    def clear_cache(cls) -> None:
        """
        Clears metadata cache (useful for reloads / admin actions).
        """
        with cls._lock:
            cls._cache.clear()

    @classmethod
    def reload_file(cls, relative_path: str) -> Dict[str, Any]:
        """
        Force reload a specific file from disk, bypassing cache.
        """
        return cls.get(relative_path, force_reload=True)
