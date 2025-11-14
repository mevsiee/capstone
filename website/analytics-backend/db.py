from sqlalchemy import create_engine

DATABASE_URL = (
    "postgresql://neondb_owner:npg_2fjYkWOmaHu1@ep-withered-mouse-adwce93k-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
)

engine = create_engine(DATABASE_URL)