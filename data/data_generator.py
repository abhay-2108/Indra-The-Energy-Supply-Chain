import sqlite3
import pandas as pd
import numpy as np
import datetime
from faker import Faker
import json
import random
import os

# Initialize Faker
fake = Faker()

DB_PATH = "supply_chain.db"
DAYS_HISTORY = 300

def create_schema(cursor):
    print("Creating schema...")
    cursor.executescript('''
        DROP TABLE IF EXISTS active_shipments;
        DROP TABLE IF EXISTS historical_market_prices;
        DROP TABLE IF EXISTS geopolitical_events_log;
        DROP TABLE IF EXISTS routes;
        DROP TABLE IF EXISTS spr_inventory;
        DROP TABLE IF EXISTS suppliers;
        DROP TABLE IF EXISTS refineries;

        CREATE TABLE refineries (
            id TEXT PRIMARY KEY,
            name TEXT,
            capacity_bpd INTEGER,
            crude_compatibility TEXT,
            current_inventory_barrels INTEGER,
            latitude REAL,
            longitude REAL
        );

        CREATE TABLE suppliers (
            id TEXT PRIMARY KEY,
            name TEXT,
            region TEXT,
            crude_grade TEXT,
            max_export_capacity_bpd INTEGER,
            port_latitude REAL,
            port_longitude REAL
        );

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

        CREATE TABLE spr_inventory (
            id TEXT PRIMARY KEY,
            location TEXT,
            capacity_barrels INTEGER,
            current_inventory_barrels INTEGER,
            max_drawdown_bpd INTEGER,
            latitude REAL,
            longitude REAL
        );

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
            current_latitude REAL,
            current_longitude REAL,
            route_progress REAL DEFAULT 0.0,
            FOREIGN KEY(supplier_id) REFERENCES suppliers(id),
            FOREIGN KEY(refinery_id) REFERENCES refineries(id),
            FOREIGN KEY(route_id) REFERENCES routes(id)
        );

        CREATE TABLE historical_market_prices (
            date TEXT,
            crude_grade TEXT,
            spot_price_usd REAL,
            PRIMARY KEY (date, crude_grade)
        );

        CREATE TABLE geopolitical_events_log (
            id TEXT PRIMARY KEY,
            date TEXT,
            region TEXT,
            event_description TEXT,
            severity_score REAL
        );
    ''')

def populate_static_data(cursor):
    print("Populating static data...")
    refineries = [
        ("REF_JAMNAGAR", "Reliance Jamnagar", 1400000, "Heavy-Sour, Light-Sweet", 21000000, 22.3444, 69.8055),
        ("REF_KOCHI", "BPCL Kochi", 310000, "Sweet, Sour", 3720000, 9.9657, 76.3866),
        ("REF_PARADIP", "IOCL Paradip", 300000, "High-Sulfur", 4200000, 20.2796, 86.6668)
    ]
    cursor.executemany("INSERT INTO refineries VALUES (?,?,?,?,?,?,?)", refineries)

    suppliers = [
        ("SUP_SAUDI", "Saudi Aramco (Ras Tanura)", "Middle East", "Arab Light (Sour)", 8000000, 26.6833, 50.1500),
        ("SUP_IRAQ", "Iraq SOMO (Al Basrah)", "Middle East", "Basra Heavy (Sour)", 3500000, 29.9322, 48.4735),
        ("SUP_US_GULF", "US Gulf Coast (Galveston)", "North America", "WTI (Sweet)", 4000000, 29.3117, -94.7934),
        ("SUP_NIGERIA", "Nigeria (Bonny Terminal)", "West Africa", "Bonny Light (Sweet)", 1500000, 4.4172, 7.1517)
    ]
    cursor.executemany("INSERT INTO suppliers VALUES (?,?,?,?,?,?,?)", suppliers)

    def make_line(lat1, lon1, lat2, lon2):
        return json.dumps({"type": "LineString", "coordinates": [[lon1, lat1], [lon2, lat2]]})

    routes = [
        ("RT_SAUDI_JAMNAGAR", "SUP_SAUDI", "India West Coast", "Strait of Hormuz", 5, "SAFE", make_line(26.6833, 50.1500, 22.3444, 69.8055)),
        ("RT_IRAQ_PARADIP", "SUP_IRAQ", "India East Coast", "Strait of Hormuz", 9, "SAFE", make_line(29.9322, 48.4735, 20.2796, 86.6668)),
        ("RT_US_JAMNAGAR", "SUP_US_GULF", "India West Coast", "Cape of Good Hope", 35, "SAFE", make_line(29.3117, -94.7934, 22.3444, 69.8055)),
        ("RT_NIGERIA_KOCHI", "SUP_NIGERIA", "India West Coast", "None", 22, "SAFE", make_line(4.4172, 7.1517, 9.9657, 76.3866))
    ]
    cursor.executemany("INSERT INTO routes VALUES (?,?,?,?,?,?,?)", routes)

    sprs = [
        ("SPR_PADUR", "Padur, Karnataka", 18300000, 18300000, 300000, 13.1833, 74.7833),
        ("SPR_MANGALURU", "Mangaluru, Karnataka", 11000000, 11000000, 250000, 12.9141, 74.8559),
        ("SPR_VIZAG", "Visakhapatnam, Andhra Pradesh", 9700000, 9700000, 200000, 17.6868, 83.2185)
    ]
    cursor.executemany("INSERT INTO spr_inventory VALUES (?,?,?,?,?,?,?)", sprs)

def generate_time_series(conn):
    print(f"Generating {DAYS_HISTORY} days of historical data...")
    today = datetime.date.today()
    dates = [today - datetime.timedelta(days=x) for x in range(DAYS_HISTORY, 0, -1)]
    
    # 1. Market Prices
    prices = []
    wti_price = 78.0
    arab_light_price = 73.0
    
    for i, d in enumerate(dates):
        # Random walk
        wti_price += np.random.normal(0, 0.8)
        arab_light_price += np.random.normal(0, 0.8)
        
        # Inject crisis spike around day 240 (60 days ago)
        if 235 < i < 245:
            arab_light_price += np.random.normal(2.0, 0.5) # Spike
            wti_price += np.random.normal(1.0, 0.5)

        prices.append((d.isoformat(), "WTI (Sweet)", round(wti_price, 2)))
        prices.append((d.isoformat(), "Arab Light (Sour)", round(arab_light_price, 2)))
        prices.append((d.isoformat(), "Basra Heavy (Sour)", round(arab_light_price - 3.0, 2)))
        prices.append((d.isoformat(), "Bonny Light (Sweet)", round(wti_price + 1.5, 2)))
    
    pd.DataFrame(prices, columns=['date', 'crude_grade', 'spot_price_usd']).to_sql('historical_market_prices', conn, if_exists='append', index=False)

    # 2. Geopolitical Events Log
    events = []
    regions = ["Middle East", "North America", "West Africa", "Global"]
    base_events = ["OPEC+ meeting held", "Routine naval patrol", "Minor port congestion reported", "Export quotas maintained"]
    
    for i, d in enumerate(dates):
        if np.random.random() < 0.1: # 10% chance of a news event per day
            region = random.choice(regions)
            desc = random.choice(base_events)
            severity = round(random.uniform(0.1, 0.3), 2)
            
            # Inject crisis buildup
            if 230 < i < 245:
                region = "Middle East"
                desc = "Escalating maritime security threats near chokepoint"
                severity = round(random.uniform(0.6, 0.9), 2)

            events.append((f"EVT_{i}", d.isoformat(), region, desc, severity))
            
    pd.DataFrame(events, columns=['id', 'date', 'region', 'event_description', 'severity_score']).to_sql('geopolitical_events_log', conn, if_exists='append', index=False)

    # 3. Active Shipments
    shipments = []
    cursor = conn.cursor()
    cursor.execute("SELECT id, supplier_id FROM routes")
    routes = cursor.fetchall()
    
    refineries = ["REF_JAMNAGAR", "REF_KOCHI", "REF_PARADIP"]
    
    shipment_id = 1
    for i, d in enumerate(dates):
        num_ships = random.randint(1, 4)
        for _ in range(num_ships):
            route_id, supplier_id = random.choice(routes)
            refinery_id = random.choice(refineries)
            vessel_name = f"MT {fake.last_name()}"
            vessel_type = random.choice(["VLCC", "Suezmax"])
            volume = random.randint(1000000, 2000000)
            
            # Determine route time to set ETA and current status
            if route_id == "RT_SAUDI_JAMNAGAR": transit = 5
            elif route_id == "RT_IRAQ_PARADIP": transit = 9
            elif route_id == "RT_US_JAMNAGAR": transit = 35
            else: transit = 22
            
            eta = d + datetime.timedelta(days=transit)
            
            if eta < today:
                status = "COMPLETED"
                cur_lat, cur_lng = None, None
                progress = 1.0
            else:
                status = "IN_TRANSIT"
                # Interpolate coordinate roughly
                cur_lat = float(np.random.normal(15, 5)) 
                cur_lng = float(np.random.normal(60, 5))
                elapsed = (today - d).days
                progress = min(0.95, max(0.05, float(elapsed) / transit))
                
            shipments.append((
                f"SHP_{shipment_id}", vessel_name, vessel_type, supplier_id, refinery_id, route_id,
                volume, d.isoformat(), eta.isoformat(), status, cur_lat, cur_lng, progress
            ))
            shipment_id += 1
            
    pd.DataFrame(shipments, columns=[
        'id', 'vessel_name', 'vessel_type', 'supplier_id', 'refinery_id', 'route_id',
        'volume_barrels', 'departure_date', 'estimated_arrival_date', 'current_status',
        'current_latitude', 'current_longitude', 'route_progress'
    ]).to_sql('active_shipments', conn, if_exists='append', index=False)
    
    print(f"Generated {len(shipments)} total shipments.")

def main():
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    create_schema(cursor)
    populate_static_data(cursor)
    generate_time_series(conn)
    
    conn.commit()
    conn.close()
    print(f"Database {DB_PATH} successfully generated!")

if __name__ == "__main__":
    main()
