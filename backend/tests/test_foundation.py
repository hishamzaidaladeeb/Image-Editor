from fastapi.testclient import TestClient
from app.main import create_app


client = TestClient(create_app())


def test_health_endpoint() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["service"] == "Image Editor API"


def test_info_endpoint() -> None:
    response = client.get("/api/v1/info")
    assert response.status_code == 200
    assert response.json()["api_prefix"] == "/api/v1"


def test_validation_error_shape() -> None:
    response = client.get("/api/v1/health?verbose=invalid", headers={"X-Request-ID": "test-request"})
    assert response.status_code == 422
    payload = response.json()
    assert payload["code"] == "VALIDATION_ERROR"
    assert payload["message"] == "تعذر التحقق من بيانات الطلب."
    assert payload["request_id"] == "test-request"
    assert payload["field_errors"][0]["field"] == "query.verbose"


def test_cors_allows_frontend_origin() -> None:
    response = client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET"
        }
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
