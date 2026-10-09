"""画面確認用の記録を作る(E2E・画面写真で使う)。端末の保存先(Capacitor Preferences の web 版)の鍵に入れる"""
import json, random, time
from datetime import datetime, timedelta

KEY = "CapacitorStorage.kotsubin.data.v1"
CATS = [
    {"id": "c-study", "name": "勉強", "color": "sora", "archived": False},
    {"id": "c-work", "name": "仕事", "color": "kinako", "archived": False},
    {"id": "c-make", "name": "創作", "color": "momo", "archived": False},
    {"id": "c-read", "name": "読書", "color": "wakaba", "archived": False},
    {"id": "c-home", "name": "家のこと", "color": "mikan", "archived": False},
]


def seeded(days=24, running=None, today_minutes=(95, 40, 30), onboarded=True, seed=7, animal="hamster", jar="round", theme="auto"):
    rnd = random.Random(seed)
    now = datetime.now().replace(second=0, microsecond=0)
    sessions = []
    sid = 0
    for back in range(days, 0, -1):
        day = (now - timedelta(days=back)).replace(hour=0, minute=0)
        if rnd.random() < 0.18:
            continue
        t = day + timedelta(hours=rnd.choice([8, 9, 10, 13]), minutes=rnd.choice([0, 10, 25, 40]))
        for _ in range(rnd.randint(2, 4)):
            mins = rnd.choice([25, 35, 50, 60, 75, 90])
            cat = rnd.choice(["c-study", "c-study", "c-work", "c-make", "c-read", "c-home"])
            sessions.append({"id": f"s{sid}", "cat": cat, "start": int(t.timestamp() * 1000), "end": int((t + timedelta(minutes=mins)).timestamp() * 1000)})
            sid += 1
            t += timedelta(minutes=mins + rnd.choice([10, 15, 30, 60]))
    # きょう
    t = now - timedelta(minutes=sum(today_minutes) + 60)
    for mins, cat in zip(today_minutes, ["c-study", "c-make", "c-read"]):
        if mins <= 0:
            continue
        sessions.append({"id": f"s{sid}", "cat": cat, "start": int(t.timestamp() * 1000), "end": int((t + timedelta(minutes=mins)).timestamp() * 1000)})
        sid += 1
        t += timedelta(minutes=mins + 10)
    data = {
        "v": 1, "onboarded": onboarded, "categories": CATS, "currentCat": "c-study", "sessions": sessions, "running": running,
        "settings": {"animal": animal, "names": {"hamster": "もち", "enaga": "ゆき", "usagi": "しらたま", "pengin": "あずき"}, "jar": jar,
                     "restMin": 10, "chimeMin": 0, "dayStartHour": 0, "goals": [0, 180, 180, 180, 180, 180, 120], "theme": theme, "notify": "on"},
    }
    return data


def init_script(data):
    return f"localStorage.setItem({json.dumps(KEY)}, {json.dumps(json.dumps(data, ensure_ascii=False))});"
