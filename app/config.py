import os
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'  # Allow OAuth without HTTPS in development

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'hard-to-guess-string'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Google OAuth Settings (Updated: May 26, 2025)
    GOOGLE_CLIENT_ID = '226601092043-rc8hvlcsiub2hirkm8vj2fqbro4f65is.apps.googleusercontent.com'
    GOOGLE_CLIENT_SECRET = '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'
    GOOGLE_DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"
    GOOGLE_REDIRECT_URI = 'http://localhost:5000/api/v1/oauth2/callback'  # Используем URI 4

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///dev.db'

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///test.db'

class ProductionConfig(Config):
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
