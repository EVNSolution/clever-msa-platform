import json
from unittest.mock import patch
from urllib.error import HTTPError

from django.test import SimpleTestCase, override_settings

from settlementinquiry.services.preview_client import PreviewClient, PreviewUnavailableError


def fake_response(body: str = "{}"):
    class FakeResponse:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def read(self):
            return body.encode("utf-8")

    return FakeResponse()


class PreviewClientTests(SimpleTestCase):
    @override_settings(SETTLEMENT_OPS_BASE_URL="http://service-settlement-operations-view:8000")
    @patch("settlementinquiry.services.preview_client.urlopen")
    def test_get_snapshot_preview_returns_payload(self, mock_urlopen) -> None:
        mock_urlopen.return_value = fake_response(json.dumps({"summary": "preview"}))

        payload = PreviewClient().get_snapshot_preview(
            snapshot_id="20000000-0000-0000-0000-000000000001",
            authorization="Bearer token",
        )

        request = mock_urlopen.call_args.args[0]
        self.assertEqual(
            request.full_url,
            "http://service-settlement-operations-view:8000/internal/settlement-inquiry-previews/20000000-0000-0000-0000-000000000001/",
        )
        self.assertEqual(request.headers["Authorization"], "Bearer token")
        self.assertEqual(payload["summary"], "preview")

    @override_settings(SETTLEMENT_OPS_BASE_URL="http://service-settlement-operations-view:8000")
    @patch("settlementinquiry.services.preview_client.urlopen")
    def test_get_snapshot_preview_wraps_upstream_failure(self, mock_urlopen) -> None:
        mock_urlopen.side_effect = HTTPError(
            url="http://service-settlement-operations-view:8000/internal/settlement-inquiry-previews/20000000-0000-0000-0000-000000000001/",
            code=503,
            msg="upstream down",
            hdrs=None,
            fp=None,
        )

        with self.assertRaises(PreviewUnavailableError):
            PreviewClient().get_snapshot_preview(
                snapshot_id="20000000-0000-0000-0000-000000000001",
                authorization="Bearer token",
            )
