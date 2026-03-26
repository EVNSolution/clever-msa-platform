from datetime import datetime, timezone

from django.conf import settings

from accounts.services.jwt_service import decode_token


def build_redis_client():
    try:
        import redis
    except ModuleNotFoundError as exc:
        raise RuntimeError("redis package is required for refresh token registry operations.") from exc
    return redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)


class RefreshRegistry:
    def __init__(self):
        self.client = build_redis_client()

    def _refresh_key(self, jti: str) -> str:
        return f"auth:refresh:{jti}"

    def _sessions_key(self, account_id: str) -> str:
        return f"auth:account:{account_id}:sessions"

    def _meta_key(self, account_id: str) -> str:
        return f"auth:account:{account_id}:meta"

    def _ttl_seconds(self, payload) -> int:
        return max(int(payload["exp"] - datetime.now(timezone.utc).timestamp()), 1)

    def _touch_meta(self, account_id: str, ttl: int) -> None:
        last_login_at = datetime.now(timezone.utc).isoformat()
        active_session_count = self.active_session_count(account_id)
        self.client.hset(
            self._meta_key(account_id),
            mapping={
                "last_login_at": last_login_at,
                "active_session_count": active_session_count,
            },
        )
        self.client.expire(self._meta_key(account_id), ttl)

    def register_refresh_token(self, token: str) -> None:
        payload = decode_token(token, "refresh")
        account_id = payload["sub"]
        jti = payload["jti"]
        ttl = self._ttl_seconds(payload)
        self.client.set(self._refresh_key(jti), account_id, ex=ttl)
        self.client.sadd(self._sessions_key(account_id), jti)
        self.client.expire(self._sessions_key(account_id), ttl)
        self._touch_meta(account_id, ttl)

    def rotate_refresh_token(self, old_token: str, new_token: str) -> None:
        old_payload = decode_token(old_token, "refresh")
        self.remove_refresh_token(old_token)
        self.register_refresh_token(new_token)
        self._touch_meta(old_payload["sub"], self._ttl_seconds(old_payload))

    def remove_refresh_token(self, token: str) -> bool:
        payload = decode_token(token, "refresh")
        account_id = payload["sub"]
        jti = payload["jti"]
        existed = bool(self.client.delete(self._refresh_key(jti)))
        self.client.srem(self._sessions_key(account_id), jti)
        self._touch_meta(account_id, self._ttl_seconds(payload))
        return existed

    def is_registered(self, token: str) -> bool:
        payload = decode_token(token, "refresh")
        return bool(self.client.exists(self._refresh_key(payload["jti"])))

    def active_session_count(self, account_id: str) -> int:
        return int(self.client.scard(self._sessions_key(account_id)))
