from pydantic import BaseModel


class AppConfig(BaseModel):
    title: str = "Substation Local OCR Service"
    version: str = "2.0.0"
    allow_origins: list[str] = ["*"]


settings = AppConfig()

