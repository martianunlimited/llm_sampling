"""Configuration settings for LLM Sampling & Decoding Playground."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings for Sampling demo."""

    app_name: str = "LLM Sampling & Decoding Playground"
    app_version: str = "0.1.0"
    base_dir: Path = Path(__file__).resolve().parent.parent
    data_dir: Path = Path(__file__).resolve().parent.parent / "data"
    presets_file: Path = Path(__file__).resolve().parent.parent / "data" / "presets.json"

    default_temperature: float = 0.8
    default_top_k: int = 10
    default_top_p: float = 0.90
    default_min_p: float = 0.0
    default_repetition_penalty: float = 1.0

    model_config = SettingsConfigDict(
        env_prefix="SAMPLING_",
        env_file=".env",
        extra="ignore",
    )


settings = Settings()
