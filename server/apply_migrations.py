import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def run_migrations():
    # استخدم Connection String من Supabase (تأكد من استخدام Port 5432)
    # تنسيق الرابط: postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
    DB_URL = os.getenv("DATABASE_URL") 
    
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        
        # قراءة ملف الـ SQL الخاص بك
        # افترضنا أن عندك ملف اسمه schema.sql
        with open('schema.sql', 'r') as f:
            sql_script = f.read()
            
        print("Running migration...")
        cur.execute(sql_script)
        
        conn.commit()
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        if conn:
            cur.close()
            conn.close()

if __name__ == "__main__":
    run_migrations()