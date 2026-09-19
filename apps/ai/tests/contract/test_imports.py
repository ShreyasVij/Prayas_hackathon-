def test_application_imports():
    from medilocker_ai.api import create_app
    app = create_app()
    paths = {route.path for route in app.routes}
    assert "/health" in paths
    assert "/extract" in paths
    assert "/vitals" in paths
