"""
create_users.py — Creates users and seeds Plant-01 and Plant-02 networks.
Usage: python create_users.py
"""
import sys, os, traceback
sys.path.insert(0, os.path.dirname(__file__))

from api.database import SessionLocal
from api import models
from api.auth import get_password_hash

USERS = [
    {"username": "admin_plant01", "email": "arjun.kumar@plant01.com", "password": "Plant@123", "role": "admin"},
    {"username": "admin_pack01",  "email": "priya.sharma@pack01.com", "password": "Pack@123",  "role": "admin"},
    {"username": "superadmin",    "email": "dev@assestsentinal.com",  "password": "Super@123", "role": "superadmin"},
    {"username": "dev",           "email": "dev2@assestsentinal.com", "password": "dev@123",   "role": "superadmin"},
]

def _a(id, name, atype, owner, site, bld, floor, zone, panel, v, i, p, f=50.0,
        maxtemp=None, maxload=100.0, vtol=5.0, ilim=None,
        brv=220.0, bri=10.0, brp=2200.0, bst=25.0, bat=25.0, bdc=1.0,
        sr=None, ds=None, vsid=None, csid=None, desc=None):
    """Build an Asset dict with only ORM-mapped columns."""
    return dict(
        id=id, name=name, asset_type=atype, owner_id=owner, description=desc,
        site=site, building=bld, floor=floor, zone=zone, panel=panel,
        rated_voltage=v, rated_current=i, rated_power=p, frequency=f,
        max_temperature=maxtemp, max_load_pct=maxload,
        voltage_tolerance=vtol, current_limit=ilim,
        baseline_rms_voltage=brv, baseline_rms_current=bri, baseline_real_power=brp,
        baseline_surface_temperature=bst, baseline_ambient_temperature=bat,
        baseline_duty_cycle=bdc, baseline_energy_consumed=0.0,
        baseline_operating_duration=0.0,
        sampling_rate=sr, data_source=ds,
        voltage_sensor_id=vsid, current_sensor_id=csid,
    )

def plant01_assets(oid):
    S="Plant-01"; B="Main Workshop"; G="Ground"
    return [
        _a("GRID-01","Grid Supply 11kV","SOURCE",oid,S,B,G,"Electrical Room",None,
           11000,30,5500000,maxload=100,vtol=5,brv=11000,bri=20,brp=3300000,bdc=1.0,sr=60,ds="SCADA",
           desc="11kV utility grid — root node for Plant-01"),
        _a("TR-01","Main Transformer 500kVA","TRANSFORMER",oid,S,B,G,"Electrical Room","TR-Bay-01",
           415,695,500000,maxtemp=85,vtol=5,ilim=720,brv=415,bri=550,brp=228250,bdc=1.0,sr=30,ds="SCADA",
           desc="500kVA 11kV/415V step-down transformer"),
        _a("ACB-01","Main Air Circuit Breaker","PANEL",oid,S,B,G,"Electrical Room","ACB-Bay",
           415,800,500000,maxtemp=60,vtol=5,brv=415,bri=500,brp=207500,bdc=1.0,sr=30,ds="SCADA",
           desc="800A ACB — main protection device"),
        _a("LT-01","Main LT Distribution Panel","PANEL",oid,S,B,G,"Electrical Room","LT-01",
           415,800,430000,maxtemp=60,maxload=90,vtol=5,ilim=850,brv=415,bri=460,brp=190900,bdc=1.0,sr=30,ds="SCADA",
           desc="415V 800A master distribution panel"),
        _a("BUSBAR-01","Power Distribution Busbar","PANEL",oid,S,B,G,"Electrical Room","BB-01",
           415,600,400000,maxtemp=55,maxload=90,vtol=5,brv=415,bri=380,brp=157700,bdc=1.0,sr=30,ds="SCADA",
           desc="Main busbar distributing power to feeder panels"),
        _a("MCC-A-01","MCC Panel A — Production Line A","PANEL",oid,S,B,G,"Production Line A","MCC-A-01",
           415,200,143000,maxtemp=55,maxload=90,vtol=5,ilim=210,brv=415,bri=140,brp=58100,bdc=0.85,sr=15,ds="IoT Gateway",
           desc="MCC for Production Line A — CNC, mill, welder, VFD"),
        _a("MCC-B-01","MCC Panel B — Production Line B","PANEL",oid,S,B,G,"Production Line B","MCC-B-01",
           415,200,143000,maxtemp=55,maxload=90,vtol=5,ilim=210,brv=415,bri=130,brp=53950,bdc=0.85,sr=15,ds="IoT Gateway",
           desc="MCC for Production Line B — compressor, conveyor, cutter"),
        _a("UTIL-01","Utility Distribution Panel","PANEL",oid,S,B,G,"Utilities","UTIL-01",
           240,100,24000,maxtemp=50,maxload=80,vtol=10,brv=230,bri=60,brp=13800,bdc=0.70,sr=60,ds="IoT Gateway",
           desc="Utility panel — pump, lighting, UPS, battery"),
        _a("HVAC-01","HVAC Distribution Panel","PANEL",oid,S,B,"Roof","HVAC Section","HVAC-01",
           415,120,86000,maxtemp=55,maxload=90,vtol=5,brv=415,bri=90,brp=37350,bdc=0.80,sr=30,ds="SCADA",
           desc="HVAC panel — manages AC, fan, and chiller"),
        # Line A
        _a("MOTOR-CNC-01","CNC Machine Drive Motor","MOTOR",oid,S,B,G,"Production Line A","MCC-A-01",
           415,29,15000,maxtemp=90,maxload=85,vtol=3,ilim=32,brv=415,bri=22,brp=9130,bst=45,bat=32,bdc=0.80,
           sr=5,ds="IoT Gateway",vsid="VS-CNC-01",csid="CS-CNC-01",
           desc="15kW CNC drive motor — sensitive to voltage fluctuations"),
        _a("MOTOR-MILL-01","Grinding Mill Motor","MOTOR",oid,S,B,G,"Production Line A","MCC-A-01",
           415,23,12000,maxtemp=90,maxload=100,vtol=5,ilim=25,brv=415,bri=20,brp=8300,bst=50,bat=32,bdc=0.90,
           sr=5,ds="IoT Gateway",vsid="VS-MILL-01",csid="CS-MILL-01",
           desc="12kW grinding mill motor — heavy-duty continuous operation"),
        _a("WELD-01","Welding Machine","LOAD",oid,S,B,G,"Production Line A","MCC-A-01",
           415,20,10000,maxtemp=80,maxload=100,vtol=10,ilim=30,brv=415,bri=15,brp=6225,bst=55,bat=32,bdc=0.60,
           sr=10,ds="IoT Gateway",desc="10kW welder — high current spikes, unstable load profile"),
        _a("VFD-01","Variable Frequency Drive A","LOAD",oid,S,B,G,"Production Line A","MCC-A-01",
           415,29,15000,maxtemp=70,maxload=90,vtol=5,brv=415,bri=22,brp=9130,bdc=0.80,
           sr=10,ds="IoT Gateway",desc="VFD Line A — controls motor speed, reduces mechanical wear"),
        # Line B
        _a("COMP-01","Air Compressor 20kW","MOTOR",oid,S,B,G,"Production Line B","MCC-B-01",
           415,39,20000,maxtemp=85,maxload=90,vtol=5,ilim=42,brv=415,bri=32,brp=13280,bst=55,bat=30,bdc=0.80,
           sr=5,ds="IoT Gateway",vsid="VS-COMP-01",csid="CS-COMP-01",
           desc="20kW air compressor — critical load, 7–10× FLA startup current"),
        _a("CONV-01","Conveyor Drive Motor","MOTOR",oid,S,B,G,"Production Line B","MCC-B-01",
           415,10,5000,maxtemp=75,maxload=85,vtol=5,ilim=12,brv=415,bri=8,brp=3320,bst=38,bat=30,bdc=0.90,
           sr=5,ds="IoT Gateway",desc="5kW conveyor motor — continuous low-load operation"),
        _a("CUTTER-01","CNC Cutter Motor","MOTOR",oid,S,B,G,"Production Line B","MCC-B-01",
           415,16,8000,maxtemp=85,maxload=90,vtol=5,ilim=18,brv=415,bri=12,brp=4980,bst=48,bat=30,bdc=0.80,
           sr=5,ds="IoT Gateway",desc="8kW precision cutter — periodic loading"),
        _a("VFD-02","Variable Frequency Drive B","LOAD",oid,S,B,G,"Production Line B","MCC-B-01",
           415,39,20000,maxtemp=70,maxload=90,vtol=5,brv=415,bri=32,brp=13280,bdc=0.80,
           sr=10,ds="IoT Gateway",desc="VFD Line B — smooths compressor startup"),
        # Utilities
        _a("PUMP-01","Process Cooling Pump","MOTOR",oid,S,B,G,"Utilities","UTIL-01",
           415,15,7500,maxtemp=70,maxload=90,vtol=5,ilim=17,brv=415,bri=12,brp=4980,bst=40,bat=30,bdc=0.90,
           sr=10,ds="IoT Gateway",desc="7.5kW cooling pump — process fluid support"),
        _a("LIGHT-01","Plant Lighting Circuit","LOAD",oid,S,B,G,"Utilities","UTIL-01",
           240,13,3000,maxtemp=40,maxload=80,vtol=10,brv=230,bri=10,brp=2300,bdc=0.70,
           sr=60,ds="IoT Gateway",desc="3kW general plant lighting"),
        _a("UPS-01","UPS System — Control Backup","LOAD",oid,S,B,G,"Utilities","UTIL-01",
           240,5,1000,maxtemp=40,maxload=80,vtol=5,brv=230,bri=4,brp=920,bdc=1.0,
           sr=60,ds="IoT Gateway",desc="UPS for PLC, SCADA and control systems"),
        _a("BATTERY-01","UPS Battery Bank","LOAD",oid,S,B,G,"Utilities","UTIL-01",
           48,50,2400,maxtemp=45,maxload=100,vtol=5,brv=48,bri=10,brp=480,bdc=0.30,
           sr=60,ds="IoT Gateway",desc="Battery bank for UPS-01 during outages"),
        # HVAC
        _a("AC-01","Precision Air Conditioning","HVAC",oid,S,B,"Roof","HVAC Section","HVAC-01",
           415,23,12000,maxtemp=50,maxload=90,vtol=5,brv=415,bri=18,brp=7470,bst=35,bat=38,bdc=0.80,
           sr=15,ds="SCADA",desc="12kW AC — production floor climate control"),
        _a("FAN-01","Industrial Exhaust Fan","HVAC",oid,S,B,"Roof","HVAC Section","HVAC-01",
           415,4,2000,maxtemp=55,maxload=90,vtol=5,brv=415,bri=3.2,brp=1328,bdc=0.85,
           sr=30,ds="SCADA",desc="2kW exhaust fan — ventilation in HVAC section"),
        _a("CHILLER-01","Industrial Chiller 25kW","HVAC",oid,S,B,"Roof","HVAC Section","HVAC-01",
           415,48,25000,maxtemp=45,maxload=90,vtol=5,ilim=52,brv=415,bri=38,brp=15770,bst=28,bat=38,bdc=0.80,
           sr=15,ds="SCADA",desc="25kW chiller — temperature-critical, high energy"),
        # Backup
        _a("DG-01","Diesel Generator 250kVA","SOURCE",oid,S,B,G,"Electrical Room","DG-Bay",
           415,347,200000,maxtemp=90,maxload=80,vtol=5,brv=415,bri=0,brp=0,bdc=0.0,
           sr=30,ds="SCADA",desc="250kVA standby DG — backup when grid fails"),
        _a("ATS-01","Auto Transfer Switch","PANEL",oid,S,B,G,"Electrical Room","ATS-Bay",
           415,347,200000,maxtemp=60,maxload=100,vtol=5,brv=415,bri=0,brp=0,bdc=0.0,
           sr=15,ds="SCADA",desc="ATS — auto-switches between GRID-01 and DG-01"),
    ]

def plant01_connections():
    return [
        ("GRID-01","TR-01","FEEDER","FDR-HV-01"),
        ("TR-01","ACB-01","FEEDER","FDR-LV-01"),
        ("ACB-01","LT-01","FEEDER","FDR-LV-02"),
        ("LT-01","BUSBAR-01","BUS",None),
        ("BUSBAR-01","MCC-A-01","FEEDER","FDR-A"),
        ("BUSBAR-01","MCC-B-01","FEEDER","FDR-B"),
        ("BUSBAR-01","UTIL-01","FEEDER","FDR-UTIL"),
        ("BUSBAR-01","HVAC-01","FEEDER","FDR-HVAC"),
        ("MCC-A-01","MOTOR-CNC-01","DIRECT",None),
        ("MCC-A-01","MOTOR-MILL-01","DIRECT",None),
        ("MCC-A-01","WELD-01","DIRECT",None),
        ("MCC-A-01","VFD-01","DIRECT",None),
        ("MCC-B-01","COMP-01","DIRECT",None),
        ("MCC-B-01","CONV-01","DIRECT",None),
        ("MCC-B-01","CUTTER-01","DIRECT",None),
        ("MCC-B-01","VFD-02","DIRECT",None),
        ("UTIL-01","PUMP-01","DIRECT",None),
        ("UTIL-01","LIGHT-01","DIRECT",None),
        ("UTIL-01","UPS-01","DIRECT",None),
        ("UPS-01","BATTERY-01","DIRECT",None),
        ("HVAC-01","AC-01","DIRECT",None),
        ("HVAC-01","FAN-01","DIRECT",None),
        ("HVAC-01","CHILLER-01","DIRECT",None),
        ("DG-01","ATS-01","DIRECT",None),
        ("ATS-01","LT-01","BREAKER","BKR-ATS"),
    ]

def plant02_assets(oid):
    S="Plant-02"; B="Packaging Block"; G="Ground"
    return [
        _a("GRID-02","Grid Supply Plant-02","SOURCE",oid,S,B,G,"Electrical Room",None,
           11000,15,2000000,maxload=100,vtol=5,brv=11000,bri=10,brp=1200000,bdc=1.0,sr=60,ds="SCADA",
           desc="11kV grid supply for Plant-02 packaging facility"),
        _a("TR-02","Transformer 250kVA Plant-02","TRANSFORMER",oid,S,B,G,"Electrical Room","TR-Bay-02",
           415,347,250000,maxtemp=80,vtol=5,ilim=370,brv=415,bri=250,brp=103750,bdc=1.0,sr=30,ds="SCADA",
           desc="250kVA 11kV/415V transformer — supplies packaging block"),
        _a("LT-02","Main LT Panel Plant-02","PANEL",oid,S,B,G,"Electrical Room","LT-02",
           415,350,230000,maxtemp=58,maxload=90,vtol=5,ilim=380,brv=415,bri=200,brp=83000,bdc=1.0,sr=30,ds="SCADA",
           desc="415V main LT panel — distributes to all packaging zones"),
        _a("BUSBAR-02","Distribution Busbar Plant-02","PANEL",oid,S,B,G,"Electrical Room","BB-02",
           415,300,200000,maxtemp=55,maxload=90,vtol=5,brv=415,bri=180,brp=74700,bdc=1.0,sr=30,ds="SCADA",
           desc="Main busbar for Plant-02 power routing"),
        _a("MCC-PACK-01","Packaging Line MCC","PANEL",oid,S,B,G,"Packaging Line","MCC-PACK-01",
           415,80,55000,maxtemp=55,maxload=90,vtol=5,brv=415,bri=55,brp=22825,bdc=0.80,sr=15,ds="IoT Gateway",
           desc="MCC for packaging conveyor, sealer and labeller"),
        _a("UTIL-02","Utility Panel Plant-02","PANEL",oid,S,B,G,"Utilities","UTIL-02",
           240,60,14000,maxtemp=50,maxload=80,vtol=10,brv=230,bri=35,brp=8050,bdc=0.70,sr=60,ds="IoT Gateway",
           desc="Utility panel — pump, lighting, UPS for Plant-02"),
        _a("STORAGE-PANEL-01","Storage Block Panel","PANEL",oid,S,B,G,"Storage","STR-PNL-01",
           415,80,55000,maxtemp=52,maxload=85,vtol=5,brv=415,bri=60,brp=24900,bdc=0.80,sr=30,ds="SCADA",
           desc="Panel supplying cold storage AC and dehumidifier"),
        _a("PACK-MOTOR-01","Packaging Conveyor Motor","MOTOR",oid,S,B,G,"Packaging Line","MCC-PACK-01",
           415,10,5000,maxtemp=75,maxload=90,vtol=5,ilim=12,brv=415,bri=8.5,brp=3528,bst=38,bat=28,bdc=0.90,
           sr=5,ds="IoT Gateway",vsid="VS-PKG-01",csid="CS-PKG-01",
           desc="5kW conveyor motor — continuously moves packaged products"),
        _a("SEALER-01","Heat Sealer Machine","LOAD",oid,S,B,G,"Packaging Line","MCC-PACK-01",
           415,8,4000,maxtemp=120,maxload=100,vtol=5,brv=415,bri=6.5,brp=2698,bst=95,bat=28,bdc=0.70,
           sr=10,ds="IoT Gateway",desc="4kW heat sealer — temperature-sensitive, cyclic operation"),
        _a("LABEL-01","Labelling Machine","LOAD",oid,S,B,G,"Packaging Line","MCC-PACK-01",
           240,13,3000,maxtemp=50,maxload=80,vtol=5,brv=230,bri=10,brp=2300,bdc=0.75,
           sr=15,ds="IoT Gateway",desc="3kW automated labeller — synchronized with conveyor"),
        _a("COLD-AC-01","Cold Storage AC Unit","HVAC",oid,S,B,G,"Storage","STR-PNL-01",
           415,29,15000,maxtemp=50,maxload=90,vtol=5,ilim=32,brv=415,bri=23,brp=9545,bst=20,bat=30,bdc=0.85,
           sr=10,ds="SCADA",desc="15kW cold storage AC — critical for product preservation"),
        _a("DEHUMIDIFIER-01","Industrial Dehumidifier","HVAC",oid,S,B,G,"Storage","STR-PNL-01",
           415,10,5000,maxtemp=45,maxload=90,vtol=5,brv=415,bri=8,brp=3320,bst=28,bat=30,bdc=0.80,
           sr=15,ds="SCADA",desc="Maintains humidity in storage zone for product quality"),
        _a("PUMP-02","Water Supply Pump Plant-02","MOTOR",oid,S,B,G,"Utilities","UTIL-02",
           415,10,5000,maxtemp=65,maxload=90,vtol=5,ilim=12,brv=415,bri=8,brp=3320,bst=38,bat=28,bdc=0.80,
           sr=15,ds="IoT Gateway",desc="Water supply pump for Plant-02 facility"),
        _a("LIGHT-02","Plant-02 Lighting Circuit","LOAD",oid,S,B,G,"Utilities","UTIL-02",
           240,8,1800,maxtemp=40,maxload=80,vtol=10,brv=230,bri=6,brp=1380,bdc=0.70,
           sr=60,ds="IoT Gateway",desc="1.8kW LED lighting for packaging and storage"),
        _a("UPS-02","UPS System Plant-02","LOAD",oid,S,B,G,"Utilities","UTIL-02",
           240,4,800,maxtemp=40,maxload=80,vtol=5,brv=230,bri=3,brp=690,bdc=1.0,
           sr=60,ds="IoT Gateway",desc="UPS backup for Plant-02 control systems"),
    ]

def plant02_connections():
    return [
        ("GRID-02","TR-02","FEEDER","FDR-HV-02"),
        ("TR-02","LT-02","FEEDER","FDR-LV-03"),
        ("LT-02","BUSBAR-02","BUS",None),
        ("BUSBAR-02","MCC-PACK-01","FEEDER","FDR-PACK"),
        ("BUSBAR-02","UTIL-02","FEEDER","FDR-UTIL-2"),
        ("BUSBAR-02","STORAGE-PANEL-01","FEEDER","FDR-STOR"),
        ("MCC-PACK-01","PACK-MOTOR-01","DIRECT",None),
        ("MCC-PACK-01","SEALER-01","DIRECT",None),
        ("MCC-PACK-01","LABEL-01","DIRECT",None),
        ("STORAGE-PANEL-01","COLD-AC-01","DIRECT",None),
        ("STORAGE-PANEL-01","DEHUMIDIFIER-01","DIRECT",None),
        ("UTIL-02","PUMP-02","DIRECT",None),
        ("UTIL-02","LIGHT-02","DIRECT",None),
        ("UTIL-02","UPS-02","DIRECT",None),
    ]

def create_users(db):
    uid_map = {}
    for u in USERS:
        try:
            existing = db.query(models.User).filter(models.User.username == u["username"]).first()
            if existing:
                if existing.role != u["role"]:
                    existing.role = u["role"]
                    db.commit()
                uid_map[u["username"]] = existing.id
                print(f"  EXISTS : {u['username']} (id={existing.id}, role={existing.role})")
            else:
                nu = models.User(
                    username=u["username"], email=u["email"],
                    hashed_password=get_password_hash(u["password"]), role=u["role"],
                )
                db.add(nu); db.commit(); db.refresh(nu)
                uid_map[u["username"]] = nu.id
                print(f"  CREATED: {u['username']} (id={nu.id}, role={nu.role})")
        except Exception:
            db.rollback(); traceback.print_exc()
    return uid_map

def seed_assets(db, assets):
    ok = 0
    for a in assets:
        try:
            if not db.query(models.Asset).filter(models.Asset.id == a["id"]).first():
                db.add(models.Asset(**a)); ok += 1
        except Exception:
            db.rollback(); traceback.print_exc()
    db.commit()
    return ok

def seed_connections(db, connections):
    ok = 0
    for p, c, t, f in connections:
        try:
            if not db.query(models.AssetConnection).filter(
                models.AssetConnection.parent_asset_id == p,
                models.AssetConnection.child_asset_id == c
            ).first():
                db.add(models.AssetConnection(parent_asset_id=p, child_asset_id=c, connection_type=t, feeder_id=f))
                ok += 1
        except Exception:
            db.rollback(); traceback.print_exc()
    db.commit()
    return ok

if __name__ == "__main__":
    db = SessionLocal()
    try:
        print("\n=== Creating Users ===")
        uid_map = create_users(db)
        p01 = uid_map.get("admin_plant01")
        p02 = uid_map.get("admin_pack01")
        print(f"\n=== Seeding Plant-01 (owner={p01}) ===")
        print(f"  Assets:      {seed_assets(db, plant01_assets(p01))}")
        print(f"  Connections: {seed_connections(db, plant01_connections())}")
        print(f"\n=== Seeding Plant-02 (owner={p02}) ===")
        print(f"  Assets:      {seed_assets(db, plant02_assets(p02))}")
        print(f"  Connections: {seed_connections(db, plant02_connections())}")
        print("\n=== Done ===")
    finally:
        db.close()
