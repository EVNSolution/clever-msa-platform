import redis
from django.conf import settings


class LockoutService:
    def __init__(self):
        self.client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
        self.threshold = settings.LOGIN_LOCKOUT_THRESHOLD
        self.ttl_seconds = settings.LOGIN_LOCKOUT_TTL_SECONDS

    def _normalized_email(self, email: str) -> str:
        return email.strip().lower()

    def _failure_key(self, email: str) -> str:
        return f"auth:lockout:{self._normalized_email(email)}:failures"

    def _lock_key(self, email: str) -> str:
        return f"auth:lockout:{self._normalized_email(email)}:locked"

    def is_locked(self, email: str) -> bool:
        return bool(self.client.exists(self._lock_key(email)))

    def record_failure(self, email: str) -> bool:
        failure_key = self._failure_key(email)
        count = int(self.client.incr(failure_key))
        self.client.expire(failure_key, self.ttl_seconds)
        if count >= self.threshold:
            self.client.set(self._lock_key(email), "1", ex=self.ttl_seconds)
            return True
        return False

    def clear_failures(self, email: str) -> None:
        self.client.delete(self._failure_key(email), self._lock_key(email))
