"""Run against a local backend; approval requires interactive confirmation."""
import json
import httpx


def main():
    with httpx.Client(base_url="http://127.0.0.1:8000", timeout=180) as client:
        response = client.post("/incidents")
        response.raise_for_status()
        identifier = response.json()["incident_id"]
        path = f"/incidents/{identifier}"
        response = client.post(path + "/investigate")
        response.raise_for_status()
        state = response.json()
        print(json.dumps(state, indent=2))
        if state["status"] == "awaiting_approval":
            approved = input("Type APPROVE to create the demo checkout index; anything else rejects: ") == "APPROVE"
            response = client.post(path + "/decision", json={"decision": "approve" if approved else "reject"})
            response.raise_for_status()
            print(json.dumps(response.json(), indent=2))
        print(f"Report: http://127.0.0.1:8000{path}/report")


if __name__ == "__main__":
    main()
