"""
Quick test script for refresh-token endpoint
Usage: python test_refresh_token.py <refresh_token>
"""
import sys
import requests
import json

def test_refresh_token(refresh_token):
    url = "http://localhost:8000/api/auth/refresh-token/"
    
    payload = {
        "refresh_token": refresh_token
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        try:
            data = response.json()
            print(f"\nResponse JSON:")
            print(json.dumps(data, indent=2))
        except:
            print(f"\nResponse Text (non-JSON):")
            print(response.text[:500])
            
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to backend server.")
        print("Make sure the Django server is running on http://localhost:8000")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_refresh_token.py <refresh_token>")
        print("Example: python test_refresh_token.py eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...")
        sys.exit(1)
    
    test_refresh_token(sys.argv[1])

