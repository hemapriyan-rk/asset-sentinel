"""
Manufacturing Plant Seed Data — AssetSentinel
Hierarchy:
  GRID → TR-01 → LT-01 → MCC-A, MCC-B, UTIL-PANEL, HVAC-PANEL
  MCC-A → MTR-A1, MTR-A2, MTR-A3
  MCC-B → MTR-B1, MTR-B2, PUMP-B1
  UTIL-PANEL → LIGHT-01, COMPRESSOR-01
  HVAC-PANEL → AHU-01, CHILLER-01
All seed assets are owner_id=NULL (visible to SuperAdmin, shared default network).
"""

SEED_ASSETS = [
    {
        "id": "GRID",
        "name": "Grid (Root Source)",
        "asset_type": "SOURCE",
        "description": "Utility electrical grid — root supply node",
        "site": "Main Plant", "building": None, "floor": None, "zone": None, "panel": None,
        "rated_voltage": 11000.0, "rated_current": 500.0, "rated_power": 5500000.0, "frequency": 50.0,
        "max_temperature": None, "max_load_pct": 100.0, "voltage_tolerance": 5.0, "current_limit": 550.0,
        "baseline_rms_voltage": 11000.0, "baseline_rms_current": 300.0, "baseline_real_power": 3300000.0,
        "baseline_duty_cycle": 1.0, "sampling_rate": 60.0, "data_source": "SCADA",
    },
    {
        "id": "TR-01",
        "name": "Step-Down Transformer",
        "asset_type": "TRANSFORMER",
        "description": "11kV / 415V step-down transformer",
        "site": "Main Plant", "building": "Substation-A", "floor": "Ground", "zone": "Zone-1", "panel": "TR-Bay-01",
        "rated_voltage": 415.0, "rated_current": 800.0, "rated_power": 500000.0, "frequency": 50.0,
        "max_temperature": 80.0, "max_load_pct": 100.0, "voltage_tolerance": 5.0, "current_limit": 850.0,
        "baseline_rms_voltage": 415.0, "baseline_rms_current": 650.0, "baseline_real_power": 269750.0,
        "baseline_duty_cycle": 1.0, "sampling_rate": 30.0, "data_source": "SCADA",
    },
    {
        "id": "LT-01",
        "name": "Main LT Panel",
        "asset_type": "DISTRIBUTION",
        "description": "Main low tension distribution panel",
        "site": "Main Plant", "building": "Building-A", "floor": "Ground", "zone": "Zone-1", "panel": "LT-01",
        "rated_voltage": 415.0, "rated_current": 600.0, "rated_power": 430000.0, "frequency": 50.0,
        "max_temperature": 60.0, "max_load_pct": 90.0, "voltage_tolerance": 5.0, "current_limit": 640.0,
        "baseline_rms_voltage": 415.0, "baseline_rms_current": 400.0, "baseline_real_power": 166000.0,
        "baseline_duty_cycle": 1.0, "sampling_rate": 30.0, "data_source": "SCADA",
    },
    {
        "id": "MCC-A",
        "name": "Motor Control Center A",
        "asset_type": "DISTRIBUTION",
        "description": "MCC for Production Line A motors",
        "site": "Main Plant", "building": "Building-A", "floor": "Ground", "zone": "Zone-2", "panel": "MCC-A",
        "rated_voltage": 415.0, "rated_current": 200.0, "rated_power": 143000.0, "frequency": 50.0,
        "max_temperature": 55.0, "max_load_pct": 90.0, "voltage_tolerance": 5.0, "current_limit": 220.0,
        "baseline_rms_voltage": 415.0, "baseline_rms_current": 140.0, "baseline_real_power": 58100.0,
        "baseline_duty_cycle": 0.85, "sampling_rate": 15.0, "data_source": "IoT Gateway",
    },
    {
        "id": "MCC-B",
        "name": "Motor Control Center B",
        "asset_type": "DISTRIBUTION",
        "description": "MCC for Production Line B motors",
        "site": "Main Plant", "building": "Building-B", "floor": "Ground", "zone": "Zone-3", "panel": "MCC-B",
        "rated_voltage": 415.0, "rated_current": 180.0, "rated_power": 129000.0, "frequency": 50.0,
        "max_temperature": 55.0, "max_load_pct": 90.0, "voltage_tolerance": 5.0, "current_limit": 200.0,
        "baseline_rms_voltage": 415.0, "baseline_rms_current": 130.0, "baseline_real_power": 53950.0,
        "baseline_duty_cycle": 0.85, "sampling_rate": 15.0, "data_source": "IoT Gateway",
    },
    {
        "id": "UTIL-PANEL",
        "name": "Utility Panel",
        "asset_type": "DISTRIBUTION",
        "description": "Lighting and utility distribution panel",
        "site": "Main Plant", "building": "Building-A", "floor": "Ground", "zone": "Zone-4", "panel": "UTIL-01",
        "rated_voltage": 240.0, "rated_current": 100.0, "rated_power": 24000.0, "frequency": 50.0,
        "max_temperature": 50.0, "max_load_pct": 80.0, "voltage_tolerance": 10.0, "current_limit": 110.0,
        "baseline_rms_voltage": 230.0, "baseline_rms_current": 60.0, "baseline_real_power": 13800.0,
        "baseline_duty_cycle": 0.70, "sampling_rate": 60.0, "data_source": "IoT Gateway",
    },
    {
        "id": "HVAC-PANEL",
        "name": "HVAC Distribution Panel",
        "asset_type": "DISTRIBUTION",
        "description": "HVAC system power distribution",
        "site": "Main Plant", "building": "Building-A", "floor": "Roof", "zone": "HVAC-Zone", "panel": "HVAC-01",
        "rated_voltage": 415.0, "rated_current": 120.0, "rated_power": 86000.0, "frequency": 50.0,
        "max_temperature": 55.0, "max_load_pct": 90.0, "voltage_tolerance": 5.0, "current_limit": 130.0,
        "baseline_rms_voltage": 415.0, "baseline_rms_current": 90.0, "baseline_real_power": 37350.0,
        "baseline_duty_cycle": 0.80, "sampling_rate": 30.0, "data_source": "SCADA",
    },
    {
        "id": "MTR-A1",
        "name": "Conveyor Drive Motor A1",
        "asset_type": "MOTOR",
        "description": "Main conveyor belt drive motor — Line A",
        "site": "Main Plant", "building": "Building-A", "floor": "Ground", "zone": "Zone-2", "panel": "MCC-A",
        "rated_voltage": 415.0, "rated_current": 55.0, "rated_power": 37000.0, "frequency": 50.0,
        "max_temperature": 90.0, "max_load_pct": 85.0, "voltage_tolerance": 5.0, "current_limit": 60.0,
        "baseline_rms_voltage": 415.0, "baseline_rms_current": 42.0, "baseline_real_power": 17430.0,
        "baseline_surface_temperature": 45.0, "baseline_ambient_temperature": 32.0,
        "baseline_duty_cycle": 0.85, "sampling_rate": 5.0, "data_source": "IoT Gateway",
        "voltage_sensor_id": "VS-A1-01", "current_sensor_id": "CS-A1-01",
    },
    {
        "id": "MTR-A2",
        "name": "Grinding Mill Motor A2",
        "asset_type": "MOTOR",
        "description": "Grinding mill drive motor — Line A",
        "site": "Main Plant", "building": "Building-A", "floor": "Ground", "zone": "Zone-2", "panel": "MCC-A",
        "rated_voltage": 415.0, "rated_current": 45.0, "rated_power": 30000.0, "frequency": 50.0,
        "max_temperature": 90.0, "max_load_pct": 85.0, "voltage_tolerance": 5.0, "current_limit": 50.0,
        "baseline_rms_voltage": 415.0, "baseline_rms_current": 35.0, "baseline_real_power": 14525.0,
        "baseline_surface_temperature": 48.0, "baseline_ambient_temperature": 32.0,
        "baseline_duty_cycle": 0.80, "sampling_rate": 5.0, "data_source": "IoT Gateway",
        "voltage_sensor_id": "VS-A2-01", "current_sensor_id": "CS-A2-01",
    },
    {
        "id": "MTR-A3",
        "name": "Fan Motor A3",
        "asset_type": "MOTOR",
        "description": "Cooling fan motor — Production Line A",
        "site": "Main Plant", "building": "Building-A", "floor": "Ground", "zone": "Zone-2", "panel": "MCC-A",
        "rated_voltage": 415.0, "rated_current": 25.0, "rated_power": 18500.0, "frequency": 50.0,
        "max_temperature": 80.0, "max_load_pct": 85.0, "voltage_tolerance": 5.0, "current_limit": 28.0,
        "baseline_rms_voltage": 415.0, "baseline_rms_current": 20.0, "baseline_real_power": 8300.0,
        "baseline_surface_temperature": 40.0, "baseline_ambient_temperature": 32.0,
        "baseline_duty_cycle": 0.75, "sampling_rate": 5.0, "data_source": "IoT Gateway",
    },
    {
        "id": "MTR-B1",
        "name": "Press Machine Motor B1",
        "asset_type": "MOTOR",
        "description": "Hydraulic press drive motor — Line B",
        "site": "Main Plant", "building": "Building-B", "floor": "Ground", "zone": "Zone-3", "panel": "MCC-B",
        "rated_voltage": 415.0, "rated_current": 60.0, "rated_power": 45000.0, "frequency": 50.0,
        "max_temperature": 90.0, "max_load_pct": 85.0, "voltage_tolerance": 5.0, "current_limit": 65.0,
        "baseline_rms_voltage": 415.0, "baseline_rms_current": 48.0, "baseline_real_power": 19920.0,
        "baseline_surface_temperature": 50.0, "baseline_ambient_temperature": 30.0,
        "baseline_duty_cycle": 0.80, "sampling_rate": 5.0, "data_source": "IoT Gateway",
        "voltage_sensor_id": "VS-B1-01", "current_sensor_id": "CS-B1-01",
    },
    {
        "id": "MTR-B2",
        "name": "Lathe Motor B2",
        "asset_type": "MOTOR",
        "description": "CNC lathe spindle motor — Line B",
        "site": "Main Plant", "building": "Building-B", "floor": "Ground", "zone": "Zone-3", "panel": "MCC-B",
        "rated_voltage": 415.0, "rated_current": 40.0, "rated_power": 30000.0, "frequency": 50.0,
        "max_temperature": 85.0, "max_load_pct": 90.0, "voltage_tolerance": 5.0, "current_limit": 44.0,
        "baseline_rms_voltage": 415.0, "baseline_rms_current": 32.0, "baseline_real_power": 13280.0,
        "baseline_surface_temperature": 44.0, "baseline_ambient_temperature": 30.0,
        "baseline_duty_cycle": 0.80, "sampling_rate": 5.0, "data_source": "IoT Gateway",
    },
    {
        "id": "PUMP-B1",
        "name": "Coolant Pump B1",
        "asset_type": "LOAD",
        "description": "Coolant circulation pump — Line B",
        "site": "Main Plant", "building": "Building-B", "floor": "Ground", "zone": "Zone-3", "panel": "MCC-B",
        "rated_voltage": 415.0, "rated_current": 15.0, "rated_power": 11000.0, "frequency": 50.0,
        "max_temperature": 70.0, "max_load_pct": 90.0, "voltage_tolerance": 5.0, "current_limit": 17.0,
        "baseline_rms_voltage": 415.0, "baseline_rms_current": 12.0, "baseline_real_power": 4980.0,
        "baseline_surface_temperature": 38.0, "baseline_ambient_temperature": 30.0,
        "baseline_duty_cycle": 0.90, "sampling_rate": 10.0, "data_source": "IoT Gateway",
    },
    {
        "id": "LIGHT-01",
        "name": "Plant Lighting Circuit",
        "asset_type": "LOAD",
        "description": "General plant area lighting distribution",
        "site": "Main Plant", "building": "Building-A", "floor": "Ground", "zone": "Zone-4", "panel": "UTIL-01",
        "rated_voltage": 240.0, "rated_current": 50.0, "rated_power": 12000.0, "frequency": 50.0,
        "max_temperature": 40.0, "max_load_pct": 80.0, "voltage_tolerance": 10.0, "current_limit": 55.0,
        "baseline_rms_voltage": 230.0, "baseline_rms_current": 35.0, "baseline_real_power": 8050.0,
        "baseline_duty_cycle": 0.70, "sampling_rate": 60.0, "data_source": "IoT Gateway",
    },
    {
        "id": "COMPRESSOR-01",
        "name": "Air Compressor",
        "asset_type": "LOAD",
        "description": "Plant compressed air system compressor",
        "site": "Main Plant", "building": "Building-A", "floor": "Ground", "zone": "Zone-4", "panel": "UTIL-01",
        "rated_voltage": 415.0, "rated_current": 30.0, "rated_power": 22000.0, "frequency": 50.0,
        "max_temperature": 75.0, "max_load_pct": 85.0, "voltage_tolerance": 5.0, "current_limit": 33.0,
        "baseline_rms_voltage": 415.0, "baseline_rms_current": 22.0, "baseline_real_power": 9130.0,
        "baseline_surface_temperature": 55.0, "baseline_ambient_temperature": 32.0,
        "baseline_duty_cycle": 0.75, "sampling_rate": 10.0, "data_source": "IoT Gateway",
    },
    {
        "id": "AHU-01",
        "name": "Air Handling Unit",
        "asset_type": "HVAC",
        "description": "Primary air handling and ventilation unit",
        "site": "Main Plant", "building": "Building-A", "floor": "Roof", "zone": "HVAC-Zone", "panel": "HVAC-01",
        "rated_voltage": 415.0, "rated_current": 60.0, "rated_power": 45000.0, "frequency": 50.0,
        "max_temperature": 50.0, "max_load_pct": 90.0, "voltage_tolerance": 5.0, "current_limit": 65.0,
        "baseline_rms_voltage": 415.0, "baseline_rms_current": 45.0, "baseline_real_power": 18675.0,
        "baseline_surface_temperature": 35.0, "baseline_ambient_temperature": 38.0,
        "baseline_duty_cycle": 0.80, "sampling_rate": 15.0, "data_source": "SCADA",
    },
    {
        "id": "CHILLER-01",
        "name": "Chiller Unit",
        "asset_type": "HVAC",
        "description": "Central cooling plant chiller",
        "site": "Main Plant", "building": "Building-A", "floor": "Roof", "zone": "HVAC-Zone", "panel": "HVAC-01",
        "rated_voltage": 415.0, "rated_current": 65.0, "rated_power": 55000.0, "frequency": 50.0,
        "max_temperature": 45.0, "max_load_pct": 90.0, "voltage_tolerance": 5.0, "current_limit": 70.0,
        "baseline_rms_voltage": 415.0, "baseline_rms_current": 55.0, "baseline_real_power": 22825.0,
        "baseline_surface_temperature": 30.0, "baseline_ambient_temperature": 38.0,
        "baseline_duty_cycle": 0.80, "sampling_rate": 15.0, "data_source": "SCADA",
    },
]

SEED_CONNECTIONS = [
    ("GRID", "TR-01", "FEEDER", "FDR-01"),
    ("TR-01", "LT-01", "FEEDER", "FDR-02"),
    ("LT-01", "MCC-A", "FEEDER", "FDR-03"),
    ("LT-01", "MCC-B", "FEEDER", "FDR-04"),
    ("LT-01", "UTIL-PANEL", "FEEDER", "FDR-05"),
    ("LT-01", "HVAC-PANEL", "FEEDER", "FDR-06"),
    ("MCC-A", "MTR-A1", "DIRECT", None),
    ("MCC-A", "MTR-A2", "DIRECT", None),
    ("MCC-A", "MTR-A3", "DIRECT", None),
    ("MCC-B", "MTR-B1", "DIRECT", None),
    ("MCC-B", "MTR-B2", "DIRECT", None),
    ("MCC-B", "PUMP-B1", "DIRECT", None),
    ("UTIL-PANEL", "LIGHT-01", "DIRECT", None),
    ("UTIL-PANEL", "COMPRESSOR-01", "DIRECT", None),
    ("HVAC-PANEL", "AHU-01", "DIRECT", None),
    ("HVAC-PANEL", "CHILLER-01", "DIRECT", None),
]


def run_seed(db):
    """Idempotent seed: only inserts if assets don't already exist."""
    from . import models as m

    inserted_assets = 0
    for a in SEED_ASSETS:
        existing = db.query(m.Asset).filter(m.Asset.id == a["id"]).first()
        if not existing:
            obj = m.Asset(
                id=a["id"], name=a["name"], asset_type=a["asset_type"],
                description=a.get("description"),
                owner_id=None,  # Seed data is system-level
                site=a.get("site"), building=a.get("building"), floor=a.get("floor"),
                zone=a.get("zone"), panel=a.get("panel"),
                rated_voltage=a.get("rated_voltage"), rated_current=a.get("rated_current"),
                rated_power=a.get("rated_power"), frequency=a.get("frequency"),
                max_temperature=a.get("max_temperature"), max_load_pct=a.get("max_load_pct", 100.0),
                voltage_tolerance=a.get("voltage_tolerance"), current_limit=a.get("current_limit"),
                baseline_rms_voltage=a.get("baseline_rms_voltage", 220.0),
                baseline_rms_current=a.get("baseline_rms_current", 10.0),
                baseline_real_power=a.get("baseline_real_power", 2200.0),
                baseline_surface_temperature=a.get("baseline_surface_temperature", 25.0),
                baseline_ambient_temperature=a.get("baseline_ambient_temperature", 25.0),
                baseline_duty_cycle=a.get("baseline_duty_cycle", 1.0),
                sampling_rate=a.get("sampling_rate"), data_source=a.get("data_source"),
                voltage_sensor_id=a.get("voltage_sensor_id"),
                current_sensor_id=a.get("current_sensor_id"),
            )
            db.add(obj)
            inserted_assets += 1

    db.commit()

    inserted_conns = 0
    for parent_id, child_id, conn_type, feeder_id in SEED_CONNECTIONS:
        dup = db.query(m.AssetConnection).filter(
            m.AssetConnection.parent_asset_id == parent_id,
            m.AssetConnection.child_asset_id == child_id
        ).first()
        if not dup:
            db.add(m.AssetConnection(
                parent_asset_id=parent_id, child_asset_id=child_id,
                connection_type=conn_type, feeder_id=feeder_id
            ))
            inserted_conns += 1

    db.commit()
    print(f"[Seed] Inserted {inserted_assets} assets, {inserted_conns} connections.")
