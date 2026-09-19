from pathlib import Path


if __name__ == "__main__":
    fixture_dir = Path(__file__).resolve().parents[1] / "tests" / "fixtures"
    fixtures = [
        p.name for p in fixture_dir.iterdir()
        if p.is_file() and not p.name.startswith(".")
    ] if fixture_dir.exists() else []
    print({"fixture_count": len(fixtures), "fixtures": fixtures})
