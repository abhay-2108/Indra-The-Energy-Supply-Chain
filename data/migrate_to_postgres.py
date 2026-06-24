import os
import sys
import sqlite3
import json
import psycopg2
import lancedb

# Add parent directory to path to allow importing config & rag_utils
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

from agents.config import DB_PATH
from agents.rag_utils import lance_conn

def get_pg_connection(db_url):
    return psycopg2.connect(db_url)

def migrate_relational_data(sqlite_conn, pg_conn):
    pg_cursor = pg_conn.cursor()
    sqlite_cursor = sqlite_conn.cursor()

    # Drop existing tables on PostgreSQL
    print("Dropping existing tables in PostgreSQL to avoid constraint issues...")
    tables_to_drop = [
        "active_shipments", "routes", "suppliers", "refineries", "spr_inventory",
        "historical_market_prices", "geopolitical_events_log", "intel_documents",
        "risk_agent_logs", "scenario_modeller_logs", "procurement_orchestrator_logs",
        "spr_optimisation_logs", "digital_twin_logs"
    ]
    for table in tables_to_drop:
        pg_cursor.execute(f"DROP TABLE IF EXISTS {table} CASCADE;")
    pg_conn.commit()

    # Define PostgreSQL schemas
    schemas = {
        "refineries": """
            CREATE TABLE refineries (
                id TEXT PRIMARY KEY,
                name TEXT,
                capacity_bpd INTEGER,
                crude_compatibility TEXT,
                current_inventory_barrels INTEGER,
                latitude DOUBLE PRECISION,
                longitude DOUBLE PRECISION
            );
        """,
        "suppliers": """
            CREATE TABLE suppliers (
                id TEXT PRIMARY KEY,
                name TEXT,
                region TEXT,
                crude_grade TEXT,
                max_export_capacity_bpd INTEGER,
                port_latitude DOUBLE PRECISION,
                port_longitude DOUBLE PRECISION
            );
        """,
        "routes": """
            CREATE TABLE routes (
                id TEXT PRIMARY KEY,
                supplier_id TEXT,
                destination_region TEXT,
                transit_chokepoint TEXT,
                transit_time_days INTEGER,
                status TEXT,
                geojson_path TEXT,
                FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
            );
        """,
        "spr_inventory": """
            CREATE TABLE spr_inventory (
                id TEXT PRIMARY KEY,
                location TEXT,
                capacity_barrels INTEGER,
                current_inventory_barrels INTEGER,
                max_drawdown_bpd INTEGER,
                latitude DOUBLE PRECISION,
                longitude DOUBLE PRECISION
            );
        """,
        "active_shipments": """
            CREATE TABLE active_shipments (
                id TEXT PRIMARY KEY,
                vessel_name TEXT,
                vessel_type TEXT,
                supplier_id TEXT,
                refinery_id TEXT,
                route_id TEXT,
                volume_barrels INTEGER,
                departure_date TEXT,
                estimated_arrival_date TEXT,
                current_status TEXT,
                current_latitude DOUBLE PRECISION,
                current_longitude DOUBLE PRECISION,
                route_progress DOUBLE PRECISION DEFAULT 0.0,
                FOREIGN KEY(supplier_id) REFERENCES suppliers(id),
                FOREIGN KEY(refinery_id) REFERENCES refineries(id),
                FOREIGN KEY(route_id) REFERENCES routes(id)
            );
        """,
        "historical_market_prices": """
            CREATE TABLE historical_market_prices (
                date TEXT,
                crude_grade TEXT,
                spot_price_usd DOUBLE PRECISION,
                PRIMARY KEY (date, crude_grade)
            );
        """,
        "geopolitical_events_log": """
            CREATE TABLE geopolitical_events_log (
                id TEXT PRIMARY KEY,
                date TEXT,
                region TEXT,
                event_description TEXT,
                severity_score DOUBLE PRECISION
            );
        """,
        "intel_documents": """
            CREATE TABLE intel_documents (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                file_size INTEGER NOT NULL,
                raw_text TEXT
            );
        """
    }

    # Add log tables to schemas
    log_tables = ["risk_agent_logs", "scenario_modeller_logs", "procurement_orchestrator_logs", "spr_optimisation_logs", "digital_twin_logs"]
    for table in log_tables:
        schemas[table] = f"""
            CREATE TABLE {table} (
                run_id TEXT PRIMARY KEY,
                timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                scenario_type TEXT,
                raw_output TEXT,
                parsed_json TEXT
            );
        """

    # Create tables
    for table_name, schema_sql in schemas.items():
        print(f"Creating table {table_name} in PostgreSQL...")
        pg_cursor.execute(schema_sql)
    pg_conn.commit()

    # Copy data for each table
    for table_name in schemas.keys():
        print(f"Migrating rows for table {table_name}...")
        sqlite_cursor.execute(f"SELECT * FROM {table_name}")
        rows = sqlite_cursor.fetchall()
        if not rows:
            print(f"Table {table_name} has 0 rows.")
            continue

        # Get column names
        sqlite_cursor.execute(f"PRAGMA table_info({table_name})")
        columns = [col[1] for col in sqlite_cursor.fetchall()]

        # Generate insert statement
        placeholders = ", ".join(["%s"] * len(columns))
        columns_str = ", ".join(columns)
        insert_query = f"INSERT INTO {table_name} ({columns_str}) VALUES ({placeholders})"

        # Insert rows
        pg_cursor.executemany(insert_query, rows)
        print(f"Successfully migrated {len(rows)} rows into {table_name}.")
    
    pg_conn.commit()
    pg_cursor.close()
    sqlite_cursor.close()

def migrate_vector_data(sqlite_conn):
    """Migrates any existing vectors in SQLite 'intel_chunks' table to LanceDB."""
    sqlite_cursor = sqlite_conn.cursor()
    # Check if intel_chunks table exists in SQLite
    sqlite_cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='intel_chunks'")
    if not sqlite_cursor.fetchone():
        print("No SQLite intel_chunks table found. Skipping vector data migration.")
        return

    sqlite_cursor.execute("SELECT doc_id, chunk_index, chunk_text, embedding FROM intel_chunks")
    rows = sqlite_cursor.fetchall()
    sqlite_cursor.close()

    if not rows:
        print("SQLite intel_chunks table is empty. Skipping vector data migration.")
        return

    print(f"Migrating {len(rows)} vector chunks from SQLite to LanceDB...")

    lance_data = []
    for doc_id, chunk_index, chunk_text, embedding_str in rows:
        try:
            embedding = json.loads(embedding_str)
            # Ensure it is a list of floats
            if isinstance(embedding, list):
                lance_data.append({
                    "doc_id": doc_id,
                    "chunk_index": chunk_index,
                    "text": chunk_text,
                    "vector": [float(x) for x in embedding]
                })
        except Exception as e:
            print(f"Error parsing embedding for doc {doc_id} chunk {chunk_index}: {e}")

    if lance_data:
        if "intel_chunks" in lance_conn.table_names():
            table = lance_conn.open_table("intel_chunks")
            # Clear existing data or delete same doc_ids to avoid duplicates
            doc_ids_to_del = list(set([item["doc_id"] for item in lance_data]))
            for d_id in doc_ids_to_del:
                table.delete(f"doc_id = '{d_id}'")
            table.add(lance_data)
        else:
            lance_conn.create_table("intel_chunks", data=lance_data)
        print(f"Successfully migrated {len(lance_data)} chunks to LanceDB.")
    else:
        print("No valid chunks were found to ingest into LanceDB.")

def main():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL environment variable is not set.")
        print("Please set it before running this script. Example:")
        print("  Windows PowerShell: $env:DATABASE_URL=\"postgresql://postgres:password@localhost:5432/indra\"")
        print("  Unix/bash: export DATABASE_URL=\"postgresql://postgres:password@localhost:5432/indra\"")
        sys.exit(1)

    if not os.path.exists(DB_PATH):
        print(f"ERROR: SQLite database file not found at: {DB_PATH}")
        sys.exit(1)

    print(f"Connecting to SQLite database at: {DB_PATH}")
    sqlite_conn = sqlite3.connect(DB_PATH)

    print(f"Connecting to PostgreSQL database at: {db_url}")
    try:
        pg_conn = get_pg_connection(db_url)
    except Exception as e:
        print(f"ERROR: Could not connect to PostgreSQL: {e}")
        sqlite_conn.close()
        sys.exit(1)

    try:
        migrate_relational_data(sqlite_conn, pg_conn)
        migrate_vector_data(sqlite_conn)
        print("\nDatabase migration completed successfully!")
    except Exception as e:
        print(f"\nMigration failed with error: {e}")
        pg_conn.rollback()
    finally:
        pg_conn.close()
        sqlite_conn.close()

if __name__ == "__main__":
    main()
