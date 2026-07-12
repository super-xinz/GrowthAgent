from typing import Any

import httpx

from .config import get_settings


class XiaohongshuError(RuntimeError):
    pass


class XiaohongshuClient:
    def __init__(self, base_url: str | None = None, *, transport=None):
        self._client = httpx.AsyncClient(
            base_url=(base_url or get_settings().xiaohongshu_mcp_url).rstrip("/"),
            timeout=httpx.Timeout(45, connect=8),
            transport=transport,
        )

    async def close(self):
        await self._client.aclose()

    async def _request(self, method: str, path: str, *, json: dict | None = None) -> dict[str, Any]:
        try:
            response = await self._client.request(method, path, json=json)
        except (httpx.TimeoutException, httpx.ConnectError) as error:
            raise XiaohongshuError("小红书服务暂时无法连接") from error
        try:
            payload = response.json()
        except ValueError as error:
            raise XiaohongshuError(
                f"小红书服务返回了无效响应（HTTP {response.status_code}）"
            ) from error
        if not response.is_success or payload.get("success") is False or payload.get("error"):
            raise XiaohongshuError(
                str(
                    payload.get("error") or payload.get("message") or f"HTTP {response.status_code}"
                )
            )
        return payload.get("data", payload)

    async def health(self):
        return await self._request("GET", "/health")

    async def login_status(self):
        return await self._request("GET", "/api/v1/login/status")

    async def login_qrcode(self):
        return await self._request("GET", "/api/v1/login/qrcode")

    async def reset_login(self):
        return await self._request("DELETE", "/api/v1/login/cookies")

    async def me(self):
        return await self._request("GET", "/api/v1/user/me")

    async def search_feeds(self, keyword: str, filters: dict | None = None):
        return await self._request(
            "POST", "/api/v1/feeds/search", json={"keyword": keyword, "filters": filters or {}}
        )

    async def feed_detail(self, feed_id: str, xsec_token: str):
        return await self._request(
            "POST",
            "/api/v1/feeds/detail",
            json={"feed_id": feed_id, "xsec_token": xsec_token, "load_all_comments": False},
        )

    async def comment(self, feed_id: str, xsec_token: str, content: str):
        return await self._request(
            "POST",
            "/api/v1/feeds/comment",
            json={"feed_id": feed_id, "xsec_token": xsec_token, "content": content},
        )

    async def reply(
        self,
        feed_id: str,
        xsec_token: str,
        content: str,
        *,
        comment_id: str = "",
        user_id: str = "",
    ):
        return await self._request(
            "POST",
            "/api/v1/feeds/comment/reply",
            json={
                "feed_id": feed_id,
                "xsec_token": xsec_token,
                "content": content,
                "comment_id": comment_id,
                "user_id": user_id,
            },
        )
