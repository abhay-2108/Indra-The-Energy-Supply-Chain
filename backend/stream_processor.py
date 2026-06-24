import os
import sys
import json
import uuid
import math
import asyncio
import datetime
import random

# Add parent directory to path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

from agents.config import query_db, execute_db, IS_POSTGRES

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS")

class InMemoryQueue:
    def __init__(self):
        self.queue = asyncio.Queue()

    async def send(self, value):
        await self.queue.put(value)

    async def receive(self):
        return await self.queue.get()

class KafkaStreamEngine:
    def __init__(self):
        self.bootstrap_servers = KAFKA_BOOTSTRAP_SERVERS
        self.use_real_kafka = bool(self.bootstrap_servers)
        self.queue = InMemoryQueue()
        self.producer = None
        self.consumer = None

    async def start(self):
        if self.use_real_kafka:
            try:
                from aiokafka import AIOKafkaProducer, AIOKafkaConsumer
                self.producer = AIOKafkaProducer(bootstrap_servers=self.bootstrap_servers)
                await self.producer.start()

                self.consumer = AIOKafkaConsumer(
                    "ais-vessel-telemetry",
                    bootstrap_servers=self.bootstrap_servers,
                    group_id="ais-ingest-group",
                    auto_offset_reset="latest"
                )
                await self.consumer.start()
                print(f"[Kafka Engine] Connected to real Kafka bootstrap servers: {self.bootstrap_servers}")
            except Exception as e:
                print(f"[Kafka Engine] Failed to connect to real Kafka, falling back to In-Memory Queue: {e}")
                self.use_real_kafka = False

    async def stop(self):
        if self.use_real_kafka:
            if self.producer:
                await self.producer.stop()
            if self.consumer:
                await self.consumer.stop()
            print("[Kafka Engine] Stopped real Kafka producer & consumer connection.")

    async def publish(self, topic, message_dict):
        if self.use_real_kafka:
            try:
                payload = json.dumps(message_dict).encode("utf-8")
                await self.producer.send_and_wait(topic, payload)
            except Exception as e:
                print(f"[Kafka Producer Error] {e}")
        else:
            await self.queue.send(message_dict)

    async def consume(self):
        if self.use_real_kafka:
            try:
                async for msg in self.consumer:
                    yield json.loads(msg.value.decode("utf-8"))
            except Exception as e:
                print(f"[Kafka Consumer Stream Error] {e}")
        else:
            while True:
                yield await self.queue.receive()

# Global Stream Engine Instance
stream_engine = KafkaStreamEngine()

# Active Background Tasks
_producer_task = None
_consumer_task = None
_running = False

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculates great-circle distance between two points in kilometers."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def interpolate_path(coords, progress):
    """Interpolates coordinates along a LineString list of [lon, lat] coordinates."""
    if not coords:
        return None, None
    if len(coords) == 1:
        return coords[0][1], coords[0][0]
    
    n = len(coords) - 1
    segment_progress = progress * n
    idx = int(segment_progress)
    idx = min(idx, n - 1)
    fraction = segment_progress - idx
    
    if progress >= 1.0:
        return coords[-1][1], coords[-1][0]
    
    p1 = coords[idx]
    p2 = coords[idx + 1]
    lon = p1[0] + fraction * (p2[0] - p1[0])
    lat = p1[1] + fraction * (p2[1] - p1[1])
    return lat, lon

def get_active_alert_zones():
    """Fetches geofencing alert zones from the latest digital twin simulation run."""
    res = query_db("SELECT parsed_json FROM digital_twin_logs ORDER BY timestamp DESC LIMIT 1")
    if not res or not res[0]["parsed_json"]:
        return []
    try:
        data = json.loads(res[0]["parsed_json"])
        return data.get("result", {}).get("geospatial_layers", {}).get("alert_zones", [])
    except Exception as e:
        print(f"[Geofencer] Error parsing active alert zones: {e}")
        return []

async def check_geofence_postgis(lat1, lon1, lat2, lon2, radius_m):
    """Runs database-level PostGIS buffer geofencing if available."""
    try:
        res = query_db("""
            SELECT ST_DWithin(
                ST_MakePoint(? , ?)::geography, 
                ST_MakePoint(? , ?)::geography, 
                ?
            ) as inside
        """, (lon1, lat1, lon2, lat2, radius_m))
        return res[0]["inside"] if res else False
    except Exception as e:
        # If PostGIS fails (e.g. extension not loaded or SQLite mode), fall back to math
        dist_km = haversine_distance(lat1, lon1, lat2, lon2)
        return (dist_km * 1000.0) <= radius_m

async def run_ais_producer():
    """Background task simulating periodic AIS vessel telemetry updates."""
    print("[AIS Stream Producer] Task started.")
    while _running:
        try:
            # Query active shipments
            shipments = query_db("""
                SELECT s.*, r.geojson_path 
                FROM active_shipments s
                JOIN routes r ON s.route_id = r.id
                WHERE s.current_status IN ('IN_TRANSIT', 'REROUTED')
            """)

            # If no active shipments are left, reactivate some completed ones to keep the simulation alive
            if len(shipments) < 10:
                print("[AIS Stream Producer] Low active shipments. Reactivating completed shipments to keep simulation alive...")
                execute_db("""
                    UPDATE active_shipments 
                    SET current_status = 'IN_TRANSIT', 
                        route_progress = 0.0,
                        current_latitude = NULL,
                        current_longitude = NULL
                    WHERE current_status = 'COMPLETED'
                """)
                # Re-query
                shipments = query_db("""
                    SELECT s.*, r.geojson_path 
                    FROM active_shipments s
                    JOIN routes r ON s.route_id = r.id
                    WHERE s.current_status IN ('IN_TRANSIT', 'REROUTED')
                """)

            for ship in shipments:
                progress = ship.get("route_progress", 0.0) or 0.0
                
                # Check route path
                try:
                    route_geo = json.loads(ship["geojson_path"])
                    coords = route_geo.get("coordinates", [])
                except Exception:
                    coords = []

                if not coords:
                    continue

                # Small randomized progress increment (arrives in ~2-4 minutes)
                step = random.uniform(0.005, 0.015)
                new_progress = min(1.0, progress + step)
                new_lat, new_lon = interpolate_path(coords, new_progress)

                if new_lat is None or new_lon is None:
                    continue

                # Publish telemetry message to simulated/real Kafka
                telemetry = {
                    "shipment_id": ship["id"],
                    "vessel_name": ship["vessel_name"],
                    "vessel_type": ship["vessel_type"],
                    "current_status": ship["current_status"],
                    "route_progress": new_progress,
                    "latitude": new_lat,
                    "longitude": new_lon,
                    "refinery_id": ship["refinery_id"],
                    "supplier_id": ship["supplier_id"],
                    "route_id": ship["route_id"]
                }
                
                await stream_engine.publish("ais-vessel-telemetry", telemetry)

        except Exception as e:
            print(f"[AIS Stream Producer Error] {e}")

        # Stream update intervals
        await asyncio.sleep(3.0)

async def run_ais_consumer():
    """Background task consuming AIS vessel telemetries and running geofencing checks."""
    print("[AIS Stream Consumer] Task started.")
    
    # Try enabling PostGIS if PostgreSQL is active
    if IS_POSTGRES:
        try:
            execute_db("CREATE EXTENSION IF NOT EXISTS postgis;")
            print("[AIS Consumer] PostGIS extension initialized successfully in PostgreSQL.")
        except Exception as e:
            print(f"[AIS Consumer] PostGIS not available (will use Haversine fallback): {e}")

    async for telemetry in stream_engine.consume():
        if not _running:
            break

        try:
            shipment_id = telemetry["shipment_id"]
            vessel_name = telemetry["vessel_name"]
            progress = telemetry["route_progress"]
            lat = telemetry["latitude"]
            lon = telemetry["longitude"]
            status = telemetry["current_status"]
            route_id = telemetry["route_id"]

            # 1. Geofencing check
            alert_zones = get_active_alert_zones()
            for zone in alert_zones:
                zone_lat = zone.get("lat")
                zone_lng = zone.get("lng")
                zone_radius = zone.get("radius", 200000) # Default to 200km in meters
                zone_name = zone.get("name", "High Risk Area")

                if zone_lat is not None and zone_lng is not None:
                    # Run spatial geofence calculation
                    is_inside = await check_geofence_postgis(lat, lon, zone_lat, zone_lng, zone_radius)
                    
                    if is_inside and status == "IN_TRANSIT":
                        # Trigger alert and update status
                        status = "BLOCKED"
                        severity = zone.get("probability", 0.9)
                        
                        # Generate alert event
                        evt_id = f"EVT_AIS_{uuid.uuid4().hex[:6]}"
                        date_str = datetime.date.today().isoformat()
                        desc = f"GEOFENCE ALERT: Vessel {vessel_name} entered {zone_name} high-threat buffer. Status set to BLOCKED."
                        
                        print(f"\n[GEOFENCE ALERT] {desc}\n")
                        
                        # Write alert into geopolitical events log
                        execute_db(
                            "INSERT INTO geopolitical_events_log (id, date, region, event_description, severity_score) VALUES (?, ?, ?, ?, ?)",
                            (evt_id, date_str, "Oceanic Transit", desc, severity)
                        )
                        break

            # 2. Check for completed voyages
            if progress >= 1.0:
                status = "COMPLETED"
                lat, lon = None, None

            # 3. Commit state updates to database
            execute_db("""
                UPDATE active_shipments 
                SET route_progress = ?, current_latitude = ?, current_longitude = ?, current_status = ? 
                WHERE id = ?
            """, (progress, lat, lon, status, shipment_id))

        except Exception as e:
            print(f"[AIS Stream Consumer Error] {e}")

async def start_stream_processor():
    """Starts the stream engine, producer, and consumer background threads."""
    global _producer_task, _consumer_task, _running
    if _running:
        return

    _running = True
    await stream_engine.start()

    _consumer_task = asyncio.create_task(run_ais_consumer())
    _producer_task = asyncio.create_task(run_ais_producer())
    print("[Stream Processor Service] Background AIS stream pipelines started successfully.")

async def stop_stream_processor():
    """Terminates all active stream consumer and producer tasks."""
    global _producer_task, _consumer_task, _running
    if not _running:
        return

    _running = False
    print("[Stream Processor Service] Stopping background AIS stream pipelines...")

    if _producer_task:
        _producer_task.cancel()
        try:
            await _producer_task
        except asyncio.CancelledError:
            pass

    if _consumer_task:
        _consumer_task.cancel()
        try:
            await _consumer_task
        except asyncio.CancelledError:
            pass

    await stream_engine.stop()
    print("[Stream Processor Service] AIS stream pipelines stopped.")
