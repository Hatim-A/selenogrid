import json
import urllib.parse
import urllib.request

titles = "|".join([
    "Mons Mouton", "Shoemaker (lunar crater)", "Nobile (crater)", "Amundsen (crater)",
    "Faustini (crater)", "Haworth (crater)", "Cabeus (crater)", "De Gerlache (crater)",
    "Malapert (crater)", "Leibnitz (crater)", "Shackleton (crater)", "Connecting Ridge",
    "Malapert Mountain", "Artemis III",
])
url = (
    "https://en.wikipedia.org/w/api.php?action=query&prop=coordinates&format=json&redirects=1&titles="
    + urllib.parse.quote(titles)
)
req = urllib.request.Request(url, headers={"User-Agent": "SelenoGrid/0.1 (hackathon research)"})
with urllib.request.urlopen(req, timeout=30) as r:
    data = json.load(r)
for page in data["query"]["pages"].values():
    print(page.get("title"), "=>", page.get("coordinates"))
