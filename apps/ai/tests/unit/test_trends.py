import pytest
from medilocker_ai.insights.trends import analyze_series


@pytest.mark.asyncio
async def test_trend_semantics():
    assert (await analyze_series([]))["pattern"] is None
    assert (await analyze_series([{"value":1}]))["pattern"] is None
    assert (await analyze_series([{"value":1},{"value":1.001}]))["pattern"] == "stable"
    assert (await analyze_series([{"value":1},{"value":2}]))["pattern"] == "rising"
    assert (await analyze_series([{"value":2},{"value":1}]))["pattern"] == "falling"
