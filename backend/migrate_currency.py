import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "expense_tracker.db")

def migrate():
    print(f"Connecting to database at {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    tables = ["expenses", "income"]
    new_columns = [
        ("currency", "TEXT DEFAULT 'USD'"),
        ("original_amount", "REAL"),
        ("exchange_rate", "REAL DEFAULT 1.0")
    ]
    
    for table in tables:
        # Check existing columns
        cursor.execute(f"PRAGMA table_info({table})")
        existing_cols = [row[1] for row in cursor.fetchall()]
        
        for col_name, col_type in new_columns:
            if col_name not in existing_cols:
                sql = f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}"
                print(f"Executing: {sql}")
                cursor.execute(sql)
            else:
                print(f"Column '{col_name}' already exists in '{table}'.")

    conn.commit()
    conn.close()
    print("Database migration for multi-currency support completed successfully!")

if __name__ == "__main__":
    migrate()
