#!/usr/bin/env python3
"""
Fills the LOCAL Firebase Emulator Suite with a realistic demo, for presentations.
It never touches the real project: every request goes to localhost.

  1. npx firebase-tools emulators:start --only auth,firestore
  2. python3 scripts/seed_demo.py
  3. ANDROID_SERIAL=emulator-5554 ./gradlew installDebug -PuseFirebaseEmulator=true
  4. In the app on the Android emulator: Log in with the demo account below.

Demo accounts (emulator only):
  demo@ascendlab.test / demo-ascend-2026   (Alex Martin, the one you log in with)
  sam@ascendlab.test  / demo-ascend-2026   (Sam Rivera, Alex's friend)
"""
import json
import os
import random
import urllib.request
from datetime import datetime, timedelta, timezone

PROJECT = "ascendlab-def55"
AUTH = "http://localhost:9099"
FS = f"http://localhost:{os.environ.get('FIRESTORE_EMULATOR_PORT', '8080')}"
DB = f"{FS}/v1/projects/{PROJECT}/databases/(default)/documents"
PASSWORD = "demo-ascend-2026"
random.seed(7)


def req(method, url, body=None, headers=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method, headers={"Content-Type": "application/json", **(headers or {})})
    with urllib.request.urlopen(r) as resp:
        return json.loads(resp.read() or b"{}")


def value(v):
    if v is None: return {"nullValue": None}
    if isinstance(v, bool): return {"booleanValue": v}
    if isinstance(v, int): return {"integerValue": str(v)}
    if isinstance(v, float): return {"doubleValue": v}
    if isinstance(v, str): return {"stringValue": v}
    if isinstance(v, datetime): return {"timestampValue": v.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")}
    if isinstance(v, list): return {"arrayValue": {"values": [value(x) for x in v]}}
    if isinstance(v, dict): return {"mapValue": {"fields": {k: value(x) for k, x in v.items()}}}
    raise TypeError(v)


def put(path, fields):
    # "Bearer owner" is the emulator's admin bypass for security rules.
    req("PATCH", f"{DB}/{path}", {"fields": {k: value(v) for k, v in fields.items()}}, {"Authorization": "Bearer owner"})


def account(email, name):
    try:
        r = req("POST", f"{AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo",
                {"email": email, "password": PASSWORD, "displayName": name, "returnSecureToken": True})
    except urllib.error.HTTPError:
        r = req("POST", f"{AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo",
                {"email": email, "password": PASSWORD, "returnSecureToken": True})
    return r["localId"]


now = datetime.now().astimezone()
day = lambda d: d.strftime("%Y-%m-%d")
ms = lambda d: int(d.timestamp() * 1000)

# Clean slate in the emulator only.
urllib.request.urlopen(urllib.request.Request(f"{FS}/emulator/v1/projects/{PROJECT}/databases/(default)/documents", method="DELETE"))
urllib.request.urlopen(urllib.request.Request(f"{AUTH}/emulator/v1/projects/{PROJECT}/accounts", method="DELETE"))

alex = account("demo@ascendlab.test", "Alex Martin")
sam = account("sam@ascendlab.test", "Sam Rivera")

# Profiles. Alex: 24, 180 cm, 80 kg, active, building muscle 4 days a week at the gym -> 3,090 kcal / 144 g protein.
put(f"users/{alex}", {"sex": "MAN", "age": 24, "heightCm": 180.0, "weightKg": 79.4, "activity": "MODERATE", "goal": "BUILD_MUSCLE",
                      "daysPerWeek": 4, "place": "GYM", "units": "METRIC", "onboardingComplete": True})
put(f"users/{sam}", {"sex": "WOMAN", "age": 23, "heightCm": 168.0, "weightKg": 63.0, "activity": "MODERATE", "goal": "GET_FIT",
                     "daysPerWeek": 3, "place": "GYM", "units": "METRIC", "onboardingComplete": True})
put(f"publicProfiles/{alex}", {"name": "Alex Martin", "code": "ALX4K7", "friends": [sam]})
put(f"publicProfiles/{sam}", {"name": "Sam Rivera", "code": "SAM9P2", "friends": [alex]})
put("friendCodes/ALX4K7", {"uid": alex})
put("friendCodes/SAM9P2", {"uid": sam})
ALEX_KCAL, ALEX_PROTEIN, SAM_KCAL, SAM_PROTEIN = 3090, 144, 2140, 108

# Program with two routines.
upper = [("bench_press", "Bench Press"), ("lat_pulldown", "Lat Pulldown"), ("db_shoulder_press", "Dumbbell Shoulder Press"),
         ("seated_cable_row", "Seated Cable Row"), ("db_curl", "Dumbbell Curl"), ("triceps_pushdown", "Triceps Pushdown")]
lower = [("squat", "Squat"), ("romanian_deadlift", "Romanian Deadlift"), ("leg_press", "Leg Press"),
         ("leg_curl", "Leg Curl"), ("standing_calf_raise_machine", "Standing Calf Raise (Machine)"), ("hanging_leg_raise", "Hanging Leg Raise")]
routine = lambda rid, name, ex: {"id": rid, "name": name, "exercises": [{"exerciseId": i, "name": n, "sets": 3, "reps": 10} for i, n in ex]}
put(f"users/{alex}/programs/upperlower", {"name": "Upper / Lower", "createdAt": ms(now - timedelta(days=60)),
                                          "routines": [routine("r-upper", "Upper body", upper), routine("r-lower", "Lower body", lower)]})
put(f"users/{alex}/programs/summer", {"name": "Summer cut", "createdAt": ms(now - timedelta(days=10)), "routines": []})
put(f"users/{alex}/meta/train", {"seeded": True, "activeProgramId": "upperlower"})

# Eight weeks of steady progress: (start kg, end kg); 0 means bodyweight.
progress = {"bench_press": (60, 72.5), "lat_pulldown": (50, 60), "db_shoulder_press": (18, 22), "seated_cable_row": (50, 62.5),
            "db_curl": (12, 16), "triceps_pushdown": (25, 32.5), "squat": (80, 100), "romanian_deadlift": (70, 85),
            "leg_press": (120, 160), "leg_curl": (35, 45), "standing_calf_raise_machine": (60, 75), "hanging_leg_raise": (0, 0)}
sessions = []
d = now - timedelta(days=56)
i = 0
while d < now - timedelta(hours=20):
    if d.weekday() in (0, 1, 3, 4):  # Mon, Tue, Thu, Fri
        sessions.append((d.replace(hour=18, minute=random.randint(0, 40)), "Upper body" if i % 2 == 0 else "Lower body"))
        i += 1
    d += timedelta(days=1)
sessions = [s for s in sessions if random.random() > 0.12]  # a few missed days, like real life

last_upper_post = None
for n, (start, title) in enumerate(sessions):
    t = n / max(1, len(sessions) - 1)
    exs = []
    for ex_id, ex_name in (upper if title == "Upper body" else lower):
        a, b = progress[ex_id]
        w = round((a + (b - a) * t) / 2.5) * 2.5
        sets = []
        if ex_id in ("bench_press", "squat"):
            sets.append({"weightKg": float(round(w * 0.5 / 2.5) * 2.5), "reps": 10, "type": "WARMUP"})
        for reps in (10, 9, 8):
            if w == 0:
                sets.append({"weightKg": 0.0, "reps": 8 + int(7 * t) - (10 - reps), "type": "NORMAL"})
            else:
                sets.append({"weightKg": float(w), "reps": reps, "type": "NORMAL"})
        exs.append({"exerciseId": ex_id, "name": ex_name, "sets": sets})
    vol = sum(s["weightKg"] * s["reps"] for e in exs for s in e["sets"])
    dur = random.randint(48, 66) * 60
    rec = 1 if n > 2 and n % 3 == 0 else 0
    put(f"users/{alex}/workouts/w{n:03d}", {"title": title, "routineId": "r-upper" if title == "Upper body" else "r-lower",
                                           "startedAt": ms(start), "finishedAt": ms(start + timedelta(seconds=dur)),
                                           "durationSec": dur, "volumeKg": float(vol), "records": rec, "exercises": exs})
    if title == "Upper body":
        last_upper_post = (start, dur, vol, exs, rec)

# Weigh-ins every ~4 days, a slow lean gain.
for k in range(14):
    wd = now - timedelta(days=56 - k * 4)
    put(f"users/{alex}/weights/{day(wd)}", {"kg": round(78.2 + k * 0.09 + random.uniform(-0.25, 0.25), 1), "at": ms(wd.replace(hour=8))})

# Feed: meals for today and yesterday, plus workouts.
audience = [alex, sam]
def meal(pid, uid, name, when, kind, desc, kcal, protein, target, ptarget, likes=()):
    # Carbs and fat roughly follow from calories and protein (fat ~30% of calories).
    fat = round(kcal * 0.30 / 9)
    carbs = max(0, round((kcal - protein * 4 - fat * 9) / 4))
    put(f"posts/{pid}", {"uid": uid, "authorName": name, "audience": audience, "dayKey": day(when), "mealType": kind,
                         "description": desc, "calories": kcal, "target": target, "protein": protein, "proteinTarget": ptarget,
                         "carbs": carbs, "fat": fat, "photo": None, "likes": list(likes), "createdAt": when})

today = now.replace(second=0, microsecond=0)
y = today - timedelta(days=1)
# Yesterday: Sam lands 30 kcal from goal and wins; Alex ends 240 under.
meal("y1", alex, "Alex Martin", y.replace(hour=8), "BREAKFAST", "Oats, banana and whey", 720, 42, ALEX_KCAL, ALEX_PROTEIN)
meal("y2", alex, "Alex Martin", y.replace(hour=13), "LUNCH", "Chicken burrito bowl", 980, 58, ALEX_KCAL, ALEX_PROTEIN)
meal("y3", alex, "Alex Martin", y.replace(hour=20), "DINNER", "Salmon, rice and greens", 1150, 52, ALEX_KCAL, ALEX_PROTEIN)
meal("y4", sam, "Sam Rivera", y.replace(hour=9), "BREAKFAST", "Greek yogurt, berries, granola", 480, 28, SAM_KCAL, SAM_PROTEIN)
meal("y5", sam, "Sam Rivera", y.replace(hour=13), "LUNCH", "Tuna salad wrap", 620, 38, SAM_KCAL, SAM_PROTEIN)
meal("y6", sam, "Sam Rivera", y.replace(hour=19), "DINNER", "Turkey pasta", 840, 46, SAM_KCAL, SAM_PROTEIN)
meal("y7", sam, "Sam Rivera", y.replace(hour=16), "SNACK", "Apple and peanut butter", 230, 7, SAM_KCAL, SAM_PROTEIN)
# Today, so far (times kept in the past).
meal("t1", alex, "Alex Martin", today.replace(hour=8, minute=10) if now.hour >= 9 else today - timedelta(minutes=50), "BREAKFAST",
     "Eggs on toast with avocado", 650, 34, ALEX_KCAL, ALEX_PROTEIN, likes=[sam])
meal("t2", sam, "Sam Rivera", today - timedelta(minutes=95), "BREAKFAST", "Protein pancakes", 520, 36, SAM_KCAL, SAM_PROTEIN, likes=[alex])
meal("t4", alex, "Alex Martin", today - timedelta(minutes=35), "LUNCH", "Chicken teriyaki, rice, broccoli", 820, 52, ALEX_KCAL, ALEX_PROTEIN)
meal("t5", alex, "Alex Martin", today - timedelta(minutes=10), "SNACK", "Skyr with honey", 210, 18, ALEX_KCAL, ALEX_PROTEIN)
meal("t3", sam, "Sam Rivera", today - timedelta(minutes=20), "LUNCH", "Poke bowl, extra edamame", 710, 41, SAM_KCAL, SAM_PROTEIN)

def workout_post(pid, uid, name, when, title, dur, vol, exs, rec, desc, likes=()):
    lines = []
    for e in exs:
        counted = [s for s in e["sets"] if s["type"] != "WARMUP"]
        best = max(counted, key=lambda s: (s["weightKg"], s["reps"]))
        best_txt = f'{best["weightKg"]:g} kg × {best["reps"]}' if best["weightKg"] > 0 else f'{best["reps"]} reps'
        lines.append({"name": e["name"], "sets": len(e["sets"]), "best": best_txt})
    put(f"posts/{pid}", {"kind": "workout", "uid": uid, "authorName": name, "audience": audience, "dayKey": day(when),
                         "title": title, "description": desc, "durationSec": dur, "volumeKg": int(vol),
                         "sets": sum(l["sets"] for l in lines), "exercises": lines, "records": rec, "likes": list(likes), "createdAt": when})

s_start, s_dur, s_vol, s_exs, s_rec = last_upper_post
workout_post("wa", alex, "Alex Martin", s_start + timedelta(seconds=s_dur), "Upper body", s_dur, s_vol, s_exs, max(1, s_rec),
             "Bench is moving again. 72.5 for 10!", likes=[sam])
sam_exs = [{"name": "Hip Thrust", "sets": [{"weightKg": 70.0, "reps": 10, "type": "NORMAL"}] * 3},
           {"name": "Bulgarian Split Squat", "sets": [{"weightKg": 12.0, "reps": 10, "type": "NORMAL"}] * 3},
           {"name": "Leg Curl", "sets": [{"weightKg": 30.0, "reps": 12, "type": "NORMAL"}] * 3}]
sam_vol = sum(s["weightKg"] * s["reps"] for e in sam_exs for s in e["sets"])
workout_post("ws", sam, "Sam Rivera", today - timedelta(minutes=140), "Glutes & hamstrings", 2880, sam_vol, sam_exs, 2,
             "Two PRs before work ☀️", likes=[])

# Shared stats for the "You vs friends" charts: 30 days of calories and weigh-ins.
def stats(uid, base_kcal, swing, start_kg, drift):
    kcal, weights = {}, {}
    for k in range(1, 31):
        d = now - timedelta(days=k)
        if random.random() < 0.85:
            kcal[day(d)] = int(base_kcal + random.uniform(-swing, swing))
        if k % 3 == 0:
            weights[day(d)] = round(start_kg + drift * (30 - k) / 30 + random.uniform(-0.3, 0.3), 1)
    return kcal, weights
ak, aw = stats(alex, 2950, 380, 78.9, 0.6)
sk, sw = stats(sam, 2100, 260, 63.8, -1.1)
ak[day(today)] = 1680
sk[day(today)] = 1230
put(f"stats/{alex}", {"kcal": ak, "weights": aw, "shareWeight": True})
put(f"stats/{sam}", {"kcal": sk, "weights": sw, "shareWeight": True})

# A conversation under Alex's workout post.
put("posts/wa/comments/c1", {"uid": sam, "authorName": "Sam Rivera", "text": "72.5 for 10 is huge! What's next, 75?",
                             "photo": None, "createdAt": now - timedelta(hours=20)})
put("posts/wa/comments/c2", {"uid": alex, "authorName": "Alex Martin", "text": "That's the plan for Monday 💪",
                             "photo": None, "createdAt": now - timedelta(hours=19)})
req("PATCH", f"{DB}/posts/wa?updateMask.fieldPaths=commentCount", {"fields": {"commentCount": value(2)}}, {"Authorization": "Bearer owner"})

print(f"Seeded: Alex {alex} ({len(sessions)} workouts), Sam {sam}. Log in as demo@ascendlab.test / {PASSWORD}")
