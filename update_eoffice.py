import json
import re
from pathlib import Path
import pandas as pd

EXCEL = Path("eoffice.xlsx")

STATION_MAP = {
    "Gudipalli":"KUPPAM","Ramakuppam":"KUPPAM","Rallabudugur":"KUPPAM","Kuppam UPS":"KUPPAM",
    "Vedurukuppam":"NAGARI","Nagari UPS":"NAGARI","S.R.Puram":"NAGARI","Nindra":"NAGARI",
    "K. Nagar":"NAGARI","Vijayapuram":"NAGARI","Palasamudram":"NAGARI",
    "Bangarupalem UPS":"PALAMANER","Baireddypalle":"PALAMANER","Palamaner UPS":"PALAMANER",
    "Gangavaram UPS":"PALAMANER","V.Kota UPS":"PALAMANER","Panjani":"PALAMANER",
    "CCS Chittoor UPS":"SPL WINGS","Chittoor Traffic UPS":"SPL WINGS",
    "Mahila UPS, Chittoor":"SPL WINGS",
    "Kanipakam":"CHITTOOR","Gudipala":"CHITTOOR","Chittoor I Town UPS":"CHITTOOR",
    "Yadamari":"CHITTOOR","Chittoor II Town UPS":"CHITTOOR","Penumur":"CHITTOOR",
    "Rompicherla":"CHITTOOR","N.R.Peta":"CHITTOOR","Kallur":"CHITTOOR",
    "Chittoor Taluk PS":"CHITTOOR","Puthalapattu UPS":"CHITTOOR",
    "G.D.Nellore UPS":"CHITTOOR","Thavanampalle":"CHITTOOR"
}

def num(v):
    try:
        return 0.0 if pd.isna(v) else float(v)
    except Exception:
        return 0.0

def score_parts(r):
    workload = r["opening"] + r["created"] + r["received"]
    disposal = min(100.0, r["disposed"] / workload * 100.0) if workload else (100.0 if r["pending"] == 0 else 0.0)
    pending_pct = min(100.0, r["pending"] / workload * 100.0) if workload else (100.0 if r["pending"] > 0 else 0.0)
    pending_control = max(0.0, 100.0 - pending_pct)

    # Pending-age control: 60 days is the reference ceiling.
    # Zero pending = full age-control score.
    age_control = 100.0 if r["pending"] <= 0 else max(0.0, 100.0 - (r["pendingDays"] / 60.0 * 100.0))

    final = disposal * 0.50 + pending_control * 0.30 + age_control * 0.20
    return disposal, pending_pct, pending_control, age_control, max(0.0, min(100.0, final))

# Read Excel in the same format as the current E-Office DSR.
df = pd.read_excel(EXCEL, header=None)

# Reporting period from the title row.
title = str(df.iloc[1,0])
m = re.search(r'(\d{2}/\d{2}/\d{4})\s+TO\s+(\d{2}/\d{2}/\d{4})', title, re.I)
report_from = m.group(1) if m else ""
report_to = m.group(2) if m else ""

records = []
for _, row in df.iloc[4:].iterrows():
    if pd.isna(row.iloc[0]):
        continue

    name = str(row.iloc[1]).strip()
    designation = str(row.iloc[2]).strip()

    opening = num(row.iloc[3])
    created = num(row.iloc[4])
    received = num(row.iloc[5])
    closed = num(row.iloc[6])
    forwarded = num(row.iloc[7])
    disposed = num(row.iloc[8])
    parked = num(row.iloc[9])
    merged = num(row.iloc[10])
    p0 = num(row.iloc[11])
    p8 = num(row.iloc[12])
    p16 = num(row.iloc[13])
    p31 = num(row.iloc[14])
    p60 = num(row.iloc[15])
    pending = num(row.iloc[16])
    pending_days = num(row.iloc[17])

    temp = {
        "opening": opening, "created": created, "received": received,
        "disposed": disposed, "pending": pending, "pendingDays": pending_days
    }
    disposal, pending_pct, pending_control, age_control, final = score_parts(temp)

    records.append({
        "slNo": int(num(row.iloc[0])),
        "name": name,
        "designation": designation,
        "opening": opening,
        "created": created,
        "received": received,
        "disposedClosed": closed,
        "disposedForwarded": forwarded,
        "disposed": disposed,
        "parked": parked,
        "merged": merged,
        "p0_7": p0,
        "p8_15": p8,
        "p16_30": p16,
        "p31_60": p31,
        "p60": p60,
        "pending": pending,
        "pendingDays": pending_days,
        "totalWorkload": opening + created + received,
        "disposalPct": round(disposal, 2),
        "pendingPct": round(pending_pct, 2),
        "pendingControl": round(pending_control, 2),
        "ageControl": round(age_control, 2),
        "score": round(final, 1),
        "section": designation,
        "station": designation if designation in STATION_MAP else "",
        "subdivision": STATION_MAP.get(designation, "")
    })

data = {
    "reporting": {"from": report_from, "to": report_to},
    "sourceFile": "eoffice.xlsx",
    "scoreFormula": {
        "disposalWeight": 0.50,
        "pendencyWeight": 0.30,
        "ageWeight": 0.20,
        "description": "Final Score = 50% Disposal + 30% Pending Control + 20% Pending Age Control"
    },
    "records": records
}

subs=[]
for sub in ["SPL WINGS","CHITTOOR","KUPPAM","PALAMANER","NAGARI"]:
    rs=[r for r in records if r["subdivision"]==sub]
    if not rs:
        continue
    total_work=sum(r["totalWorkload"] for r in rs)
    total_disposed=sum(r["disposed"] for r in rs)
    total_pending=sum(r["pending"] for r in rs)
    disposal=min(100,total_disposed/total_work*100) if total_work else 0
    pend_pct=min(100,total_pending/total_work*100) if total_work else 0
    pending_control=max(0,100-pend_pct)
    # Aggregate age score weighted by pending files.
    pending_days_sum=sum(r["pending"]*r["pendingDays"] for r in rs)
    age_avg=pending_days_sum/total_pending if total_pending else 0
    age_control=100 if total_pending==0 else max(0,100-age_avg/60*100)
    aggregate=disposal*.50+pending_control*.30+age_control*.20
    ranked=sorted(rs,key=lambda r:r["score"],reverse=True)
    subs.append({
        "subdivision": sub,
        "ps_count": len(rs),
        "average_score": round(sum(r["score"] for r in rs)/len(rs),1),
        "aggregate_score": round(aggregate,1),
        "grade": "A+" if aggregate>=90 else ("A" if aggregate>=80 else ("B" if aggregate>=70 else "C")),
        "top_ps": ranked[0]["station"] if ranked else "—",
        "weakest_ps": ranked[-1]["station"] if ranked else "—",
        "total_workload": total_work,
        "total_received": sum(r["received"] for r in rs),
        "total_disposed": total_disposed,
        "total_pendency": total_pending,
        "disposal_pct": round(disposal,2),
        "pending_pct": round(pend_pct,2),
        "stations": [
            {
                "station": r["station"], "employee": r["name"],
                "opening": r["opening"], "created": r["created"], "received": r["received"],
                "disposed": r["disposed"], "parked": r["parked"], "merged": r["merged"],
                "pendency": r["pending"], "average_pending_days": r["pendingDays"],
                "score": r["score"], "disposal_pct": r["disposalPct"], "pending_pct": r["pendingPct"]
            } for r in rs
        ]
    })

subs.sort(key=lambda x:x["average_score"], reverse=True)
for i,s in enumerate(subs,1):
    s["rank"]=i

Path("data.json").write_text(json.dumps(data,indent=2),encoding="utf-8")
Path("subdivision_data.json").write_text(json.dumps({
    "reporting": data["reporting"],
    "scoreFormula": data["scoreFormula"],
    "subdivisions": subs
},indent=2),encoding="utf-8")

print(f"Updated {len(records)} E-Office records for {report_from} to {report_to}")
