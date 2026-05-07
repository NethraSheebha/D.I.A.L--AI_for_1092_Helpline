import httpx
import asyncio
import sys

async def test():
    async with httpx.AsyncClient() as client:
        try:
            # Try multiple variations
            urls = [
                "http://localhost:8000/agent/simulate-call/default",
                "http://localhost:8000/api/agent/simulate-call/default",
                "http://localhost:8000/simulate-call/default"
            ]
            for url in urls:
                print(f"Triggering POST {url}...")
                response = await client.post(url, timeout=10.0)
                print(f"Status: {response.status_code}")
                if response.status_code == 202:
                    print("SUCCESS!")
                    return
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test())
