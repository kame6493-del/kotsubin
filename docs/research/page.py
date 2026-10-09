import re, json, urllib.request, sys
ids={'nekokintai':6801066427,'studylive':6756206649,'synaps':6756655880,'komoriba':6760276843,'focusflight':6648771147,'mylittlepomodoro':6737629792,'chillwithyou':6757417650}
H={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36','Accept-Language':'ja'}
for k,i in ids.items():
    s=urllib.request.urlopen(urllib.request.Request(f'https://apps.apple.com/jp/app/id{i}',headers=H),timeout=30).read().decode('utf-8')
    open(f'{k}.html','w',encoding='utf-8').write(s)
    out=[]
    for m in re.finditer(r'"reviewerName"', s):
        seg=s[max(0,m.start()-1500):m.start()+300]
        t=re.findall(r'"title":"((?:[^"\]|\.)*)"',seg)
        c=re.findall(r'"(?:review|contents)":"((?:[^"\]|\.)*)"',seg)
        r=re.findall(r'"rating":(\d)',seg)
        out.append({'title':t[-1] if t else '','body':(c[-1] if c else '')[:600],'rating':r[-1] if r else ''})
    json.dump(out,open(f'{k}_pagereviews.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
    print(k,len(out))
