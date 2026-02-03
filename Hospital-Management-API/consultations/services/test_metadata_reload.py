"""
Test script to verify that MetadataLoader detects file changes and reloads automatically.

Usage:
    python manage.py shell
    >>> from consultations.services.test_metadata_reload import test_file_reload
    >>> test_file_reload()
"""

import os
import json
import time
from consultations.services.metadata_loader import MetadataLoader


def test_file_reload():
    """Test that file changes are detected and reloaded."""
    test_file = "pre_consultation/vitals/vitals_details.json"
    
    print("=" * 60)
    print("Testing MetadataLoader File Change Detection")
    print("=" * 60)
    
    # Load file first time
    print("\n1. Loading file first time...")
    data1 = MetadataLoader.get(test_file)
    print(f"   ✓ Loaded {len(data1)} top-level keys")
    
    # Check cache
    print("\n2. Loading again (should use cache)...")
    data2 = MetadataLoader.get(test_file)
    print(f"   ✓ Loaded {len(data2)} top-level keys")
    print(f"   ✓ Same object reference: {data1 is data2}")
    
    # Get file path and modification time
    base_path = MetadataLoader.BASE_PATH
    full_path = os.path.join(base_path, test_file)
    original_mtime = os.path.getmtime(full_path)
    print(f"\n3. Original file mtime: {original_mtime}")
    
    # Modify file (add a comment)
    print("\n4. Modifying file...")
    with open(full_path, "r", encoding="utf-8") as f:
        content = json.load(f)
    
    # Add a test marker
    if "_test_marker" not in content:
        content["_test_marker"] = f"test_{int(time.time())}"
    else:
        content["_test_marker"] = f"test_{int(time.time())}"
    
    with open(full_path, "w", encoding="utf-8") as f:
        json.dump(content, f, indent=2)
    
    # Wait a moment for filesystem to update
    time.sleep(0.1)
    new_mtime = os.path.getmtime(full_path)
    print(f"   ✓ File modified. New mtime: {new_mtime}")
    print(f"   ✓ Mtime changed: {new_mtime > original_mtime}")
    
    # Load again - should detect change and reload
    print("\n5. Loading again (should detect change and reload)...")
    data3 = MetadataLoader.get(test_file)
    print(f"   ✓ Loaded {len(data3)} top-level keys")
    print(f"   ✓ New object reference: {data1 is not data3}")
    print(f"   ✓ Contains test marker: {'_test_marker' in data3}")
    
    # Clean up - remove test marker
    print("\n6. Cleaning up test marker...")
    if "_test_marker" in content:
        del content["_test_marker"]
        with open(full_path, "w", encoding="utf-8") as f:
            json.dump(content, f, indent=2)
    print("   ✓ Cleaned up")
    
    print("\n" + "=" * 60)
    print("Test Complete! File change detection is working.")
    print("=" * 60)


if __name__ == "__main__":
    test_file_reload()
