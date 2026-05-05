import asyncio
import httpx
import time

URL = "http://127.0.0.1:8000/api/v1/analyze"
IMAGE_PATH = r"C:\Users\tanap\Downloads\Sample\Sample\ViewImage (2).jpg" # <--- เปลี่ยนเป็นชื่อไฟล์รูปที่มีในเครื่องคุณ
CONCURRENT_USERS = 200

async def send_request(client, user_id):
    files = {'file': open(IMAGE_PATH, 'rb')}
    data = {'expected_view': 'Front'}
    
    start_time = time.time()
    try:
        response = await client.post(URL, files=files, data=data, timeout=30.0)
        elapsed = time.time() - start_time
        print(f"User {user_id}: Status {response.status_code} | Time: {elapsed:.2f}s")
    except Exception as e:
        print(f"User {user_id}: Failed! {e}")

async def main():
    async with httpx.AsyncClient() as client:
        print(f"🚀 Sending {CONCURRENT_USERS} requests simultaneously...")
        start_total = time.time()
        tasks = [send_request(client, i) for i in range(CONCURRENT_USERS)]
        await asyncio.gather(*tasks)
        print(f"🏁 Total time for all users: {time.time() - start_total:.2f}s")

if __name__ == "__main__":
    asyncio.run(main())
