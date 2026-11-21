import pytest
from fastapi.testclient import TestClient
from pathlib import Path

from app.main import app
from models.search import SearchMode

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "app_name" in data

def test_indexing_status():
    response = client.get("/api/v1/index/status")
    assert response.status_code == 200
    data = response.json()
    assert "state" in data
    assert "indexed_files" in data
    assert "index_location" in data

def test_no_duplicate_routes():
    # Without /api/v1 prefix, endpoint should return 404
    response = client.post("/search", json={"query": "test"})
    assert response.status_code == 404

def test_search_endpoint_exact():
    response = client.post(
        "/api/v1/search",
        json={"query": "document", "mode": "exact", "limit": 5, "threshold": 0.4}
    )
    assert response.status_code == 200
    data = response.json()
    assert "query" in data
    assert "results" in data
    assert isinstance(data["results"], list)

def test_search_endpoint_get():
    response = client.get("/api/v1/search?q=test&limit=5")
    assert response.status_code == 200
    data = response.json()
    assert "results" in data

def test_file_preview_traversal_blocked():
    # Path traversal should be rejected with 403 Forbidden
    response = client.get("/api/v1/files/preview?path=../../etc/passwd")
    assert response.status_code == 403

def test_file_preview_nonexistent():
    # Non-existent file inside home/allowed
    fake_path = str(Path.home() / "nonexistent_lifelens_file.txt")
    response = client.get(f"/api/v1/files/preview?path={fake_path}")
    assert response.status_code == 404

def test_clusters_endpoint():
    response = client.get("/api/v1/clusters")
    assert response.status_code == 200
    data = response.json()
    assert "clusters" in data
    assert "count" in data
