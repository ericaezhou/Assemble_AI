# test_api_u2u.py
import json
import requests

def main():
    url = "http://localhost:5000/api/u2u/matches"
    payload = {
        "target_id": "cc3f65a2-946f-414b-8712-a535ac3830e0",
        # "target_id": "11111111-1111-1111-1111-111111111111",
        "top_k": 5,
        "min_score": 0.0,
        "apply_mmr": False,
        "mmr_lambda": 0.5,
    }

    resp = requests.post(url, json=payload, timeout=60)

    print("Status:", resp.status_code)

    try:
        data = resp.json()
        print(json.dumps(data, ensure_ascii=False, indent=2))
    except Exception:
        print(resp.text)

if __name__ == "__main__":
    main()
