# test_api_u2u.py
import json
import requests

def main():
    url = "http://localhost:5000/api/u2u/matches"
    payload = {
        "target_id": "1aefc613-ba68-4616-a15e-3d381efb6689",
        "top_k": 5,
        "min_score": 0.0,
        "apply_mmr": True,
        "mmr_lambda": 0.5,
    }

    resp = requests.post(url, json=payload, timeout=60)

    print("Status:", resp.status_code)
    # 如果后端返回不是 JSON，这里会抛异常；先 try 一下更稳
    try:
        data = resp.json()
        print(json.dumps(data, ensure_ascii=False, indent=2))
    except Exception:
        print(resp.text)

if __name__ == "__main__":
    main()
