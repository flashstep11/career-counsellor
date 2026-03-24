from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MONGODB_URL: str
    DB_NAME: str
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    CORS_ALLOW_ORIGINS: str
    GEMINI_API_KEY: str
    # Twilio SMS (deprecated - using email instead)
    ACCOUNT_SID: str = ""
    AUTH_TOKEN: str = ""
    TWILIO_SMS_FROM: str = ""
    # Email (FastAPI-Mail) settings for OTP delivery
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = ""
    MAIL_FROM_NAME: str = ""
    MAIL_PORT: int = 587
    MAIL_SERVER: str = ""
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False
    JAAS_APP_ID: str = ""
    JAAS_KEY_ID: str = ""


    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
